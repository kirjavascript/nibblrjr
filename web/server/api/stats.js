const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');

const storagePath = path.join(__dirname, '../../../storage');
const cachePath = path.join(__dirname, '../../../cache/stats');

module.exports = async ({ parent, app }) => {

    const exists = async (dir) => !!await fs.stat(dir).catch(err => false);

    if (!await exists(cachePath)) {
        await fs.mkdir(cachePath);
    }

    // load databases

    const databases = (await fs.readdir(storagePath))
        .map(file => {
            const db = new Database(path.join(storagePath, file), { readonly: true });
            const name = path.parse(file).name;
            const server = parent.servers.find(d => d.address == name);
            const trigger = server ? server.trigger : '~';
            return { db, name, trigger };
        })
        .filter(({ db }) => (
            db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='log';`).get()
        ));

    // api

    const { commands } = parent.database;

    app.post('/api/stats/base', (req, res) => {
        const { month } = req.body;
        const dateTo = month ? `${month}-01` : 'now'
        const servers = databases.map(({ db, name }) => {
            return {
                server: name,
                channels: db.prepare(`
                    SELECT DISTINCT lower(target) as channel
                    FROM log
                    WHERE command='PRIVMSG'
                    AND target LIKE '#%'
                    AND time BETWEEN date(?, '-1 month') AND date(?)
                `).all(dateTo, dateTo).map(d => d.channel),
            };
        });

        res.json({
            commands: commands.count(),
            servers,
            uptime: 0 | (new Date() - parent.epoch) / 36e5,
        });
    });

    // cache middleware

    app.post('/api/stats/all', async (req, res, next) => {
        const { server = '', channel = '', month = '' } = req.body;
        const statsPath = path.join(cachePath, `${server}-${channel}-${month}`);
        if (await exists(statsPath)) {
            res.type('application/json')
                .send(await fs.readFile(statsPath, 'utf8'));
        } else {
            const { json } = res;
            res.json = function (obj) {
                json.call(this, obj);
                fs.writeFile(statsPath, JSON.stringify(obj), 'utf8');
            };
            next();
        }
    })

    app.post('/api/stats/all', (req, res) => {
        const { server, channel, month } = req.body;
        const dateTo = month ? `${month}-01` : 'now'
        const dbList = databases.filter(({ name }) => !server || name === server);
        const [channelStr, channelArgs] = channel
            ? ['AND lower(target) = ?', [channel]]
            : ['', []];

        function getStat(statement, args) {
            return dbList.reduce((acc, server) => {
                acc.push(...server.db.prepare(statement(server)).all(...args))
                return acc;
            }, []);
        }

        const commands = getStat(({ trigger }) => `
            SELECT command_trigger as command, count(command_trigger) as count
            FROM (
                SELECT CASE WHEN instr(message, ' ') <> 0 THEN substr(message, 1, instr(message, ' ')-1) ELSE message END as command_trigger
                FROM log
                WHERE time BETWEEN date(?, '-1 month') AND date(?)
                ${channelStr}
                AND command = 'PRIVMSG'
                AND message LIKE ${JSON.stringify(trigger + '%')}
            )
            WHERE command <> ''
            GROUP BY command
            ORDER BY count DESC
            LIMIT 10
        `, [dateTo, dateTo, ...channelArgs]);

        const activityHours = getStat(() => `
            SELECT strftime('%H', time) as hour, count(*) as count
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            GROUP BY hour
        `, [dateTo, dateTo, ...channelArgs]);

        const activityDays = getStat(() => `
            SELECT strftime('%m-%d', time) as day, count(*) as count
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            GROUP BY day
        `, [dateTo, dateTo, ...channelArgs]);

        const links = dbList.flatMap(({ db, name }) => {
            const users = db.prepare(`
                SELECT user, count(lower(user)) as count
                FROM log
                WHERE time BETWEEN date(?, '-1 month') AND date(?)
                ${channelStr}
                GROUP BY lower(user)
                ORDER BY count DESC
                LIMIT 10
            `)
                .all([dateTo, dateTo, ...channelArgs])
                .map(d => d.user);

            if (!users.length) return [];

            return db.prepare(
                users.map(() => `
                    SELECT user as source, count(*) as count, ? as server, ? as target
                    FROM log
                    WHERE time BETWEEN date(?, '-1 month') AND date(?)
                    ${channelStr}
                    AND message LIKE ?
                    AND command = 'PRIVMSG'
                    GROUP BY source
                `).join(' UNION ')
            ).all(
                users.flatMap((user) => [
                    name, user, dateTo, dateTo, ...channelArgs, `%${user}%`,
                ])
            );
        });

        // short stats

        const avgLineLengthHigh = getStat(() => `
            SELECT user, avg(length(message)) as average
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND message <> ''
            AND command = 'PRIVMSG'
            GROUP BY lower(user)
            ORDER BY average DESC
            LIMIT 1
        `, [dateTo, dateTo, ...channelArgs]);

        const avgLineLengthLow = getStat(() => `
            SELECT user, avg(length(message)) as average
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND message <> ''
            AND command = 'PRIVMSG'
            GROUP BY lower(user)
            ORDER BY average ASC
            LIMIT 1
        `, [dateTo, dateTo, ...channelArgs]);

        const shouting = getStat(() => `
            SELECT user, count(message) as count
            FROM LOG
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND message = upper(message)
            AND ( ${Array.from({length: 26}, (_, i) => `message LIKE '%${String.fromCharCode(i+65)}%'`).join(' OR ')} )
            AND length(message) > 10
            AND command = 'PRIVMSG'
            GROUP BY lower(user)
            LIMIT 1
        `, [dateTo, dateTo, ...channelArgs]);

        const questions = getStat(() => `
            SELECT user, count(message) as count
            FROM LOG
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND message LIKE '%?%' AND message NOT LIKE '%http%'
            AND command = 'PRIVMSG'
            GROUP BY lower(user)
            LIMIT 1
        `, [dateTo, dateTo, ...channelArgs]);

        const kicks = getStat(() => `
            SELECT user, count(lower(user)) as count
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND command = "KICK"
            GROUP BY lower(user)
            ORDER BY count DESC
            LIMIT 10
        `, [dateTo, dateTo, ...channelArgs]);

        const kicked = getStat(() => `
            SELECT user, count(user) as count
            FROM (
                SELECT substr(message, 1, instr(message, ' ')-1) as user
                FROM log
                WHERE time BETWEEN date(?, '-1 month') AND date(?)
                ${channelStr}
                AND command = "KICK"
            )
            GROUP BY user
            ORDER BY count DESC
        `, [dateTo, dateTo, ...channelArgs]);

        res.json({
            commands,
            activityHours,
            activityDays,
            links,

            avgLineLengthHigh,
            avgLineLengthLow,
            shouting,
            questions,
            kicks,
            kicked,
        });
    });

        // TODO: cache (on disk?) (caching results....)

    // popup on force
    // activity user ranking (*)
    //


    // todo: truncate nibblr messages to log
    // activity: do a multiline chart with hover over messages
// updated hourly

    // databases.forEach(({ db }) => {
    //     console.log(
    //         db.prepare(`
    //         `)
    //         .all()
    //     )
    // });


        // const userActivity = getStat(() => `
        //     SELECT user, count(lower(user)) as count
        //     FROM log
        //     WHERE time BETWEEN date(?, '-1 month') AND date(?)
        //     ${channelStr}
        //     GROUP BY lower(user)
        //     ORDER BY count DESC
        //     LIMIT 10
        // `, [dateTo, dateTo, ...channelArgs]);

`
    #server total lines
    SELECT COALESCE(MAX(idx)+1, 0) FROM log

    #user activity
    SELECT user, count(lower(user)) as count
    FROM log
    WHERE lower(target)="#code"
    AND time BETWEEN date('now', '-1 year') AND date('now')
    GROUP BY lower(user)
    ORDER BY count DESC
    LIMIT 10
`;

// https://i.imgur.com/n0rIWIO.png
// http://buffy.myrealm.co.uk/afsmg/stats/
//http://www.df7cb.de/irc/pisg/pisg-month.html
    //https://chanstat.net/stats/rizon/%23homescreen

// kick / death ratio

// join part vs activity

// user stats
// URL linkers
// richest
// 21:03 <+Kirjava> this is all great
// 21:03 <eyeoh> what about pisg
// 21:03 <eyeoh> http://pisg.sourceforge.net/examples
// 21:04 <+nibblrjr> >> pisg - Perl IRC Statistics Generator :: Examples
// 21:04 <mordini> swear i thought you typoed pigs
// 21:05 <mordini> http://aurora.bot.free.fr/Stats/eloosmotus-FR.html
// 21:05 <+nibblrjr> >> #EloosMotus @ R�seau Europnet - stats par Zephir
// 21:05 <mordini> haven't seen a page like that in a while
// 21:05 <+IckleFinn> I hope you are writing this down then
// 21:06 <+IckleFinn> Would love a count of swearwords as well
// 21:06 <+IckleFinn> Most swearing person
// 21:08 <+IckleFinn> You are going to do the lurker club?
// 21:08 <+Kirjava> the what
// 21:08 <+IckleFinn> longest time online without message
// 21:17 <+IckleFinn> Kirjava: You going to make a heatmap for activity based on time?
// 10:56 <nibblrjr1> <Kirjava> track nick changes stats with nibblr (also maybe use it to work out nick groups (1 day ago)
// swears

// 18:39 <&cr0sis> showed you graphically with stronger and more frequent lines who spoke to who
// 18:40 <&cr0sis> also how about people who use the same words, and also people who use the same words that are also unique to those people
};
