const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

module.exports = function({ parent, app }) {

    // load databases

    const storagePath = path.join(__dirname, '../../../storage');
    const databases = fs.readdirSync(storagePath)
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

    app.post('/api/stats/all', (req, res) => {
        const { server, channel, month } = req.body;
        const dateTo = month ? `${month}-01` : 'now'
        const dbList = databases.filter(({ name }) => !server || name === server);
        const [channelStr, channelArgs] = channel
            ? ['AND lower(target)=?', [channel]]
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
                SELECT substr(message, 1, instr(message, ' ')-1) as command_trigger
                FROM log
                WHERE time BETWEEN date(?, '-1 month') AND date(?)
                ${channelStr}
                AND command = 'PRIVMSG'
                AND message LIKE '${trigger}%'
            )
            WHERE command <> ''
            GROUP BY command
            ORDER BY count DESC
            LIMIT 10
        `, [dateTo, dateTo, ...channelArgs]);

        // TODO: cache (on disk?)

        // const userActivity = getStat(() => `
        //     SELECT user, count(lower(user)) as count
        //     FROM log
        //     WHERE time BETWEEN date(?, '-1 month') AND date(?)
        //     ${channelStr}
        //     GROUP BY lower(user)
        //     ORDER BY count DESC
        //     LIMIT 10
        // `, [dateTo, dateTo, ...channelArgs]);

        const activity = getStat(() => `
            SELECT strftime('%H', time) as hour, count(*) as count
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            GROUP BY hour
        `, [dateTo, dateTo, ...channelArgs]);

        res.json({
            activity,
            commands,
        });
    });

    // todo: truncate nibblr messages to log
    // activity: do a multiline chart with hover over messages
// updated hourly
// Kirjava: you could also make some stats about who starts the games :p

    // databases.forEach(({ db }) => {
    //     console.log(
    //         db.prepare(`
    //         `)
    //         .all()
    //     )
    // });


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

    #user avg line length
    SELECT user, avg(length(message)) as average
    FROM log
    GROUP BY lower(user)
    ORDER BY average DESC
    LIMIT 10

    #user kicks
    SELECT user, count(lower(user)) as count
    FROM log
    WHERE command = "KICK"
    GROUP BY lower(user)
    ORDER BY count DESC
    LIMIT 10

    #user kicked
    SELECT kicked, count(kicked) as count
    FROM (
        SELECT substr(message, 1, instr(message, ' ')-1) as kicked
        FROM log
        WHERE command = "KICK"
        AND lower(target)="#rubik"
    )
    GROUP BY kicked
    ORDER BY count DESC
`;

    // most run commands

// http://buffy.myrealm.co.uk/afsmg/stats/
    //https://chanstat.net/stats/rizon/%23homescreen
    // hardcode cake^ -> Kirjava

// kick / death ratio

// user stats
    // number of commands served
    // most kicked
    // questions asked
    // yelling
    // most mentioned person
    // semtiment analysis
    // activity time
    // I also want to see people who join the most compared to people who stay online
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

// 18:39 <&cr0sis> showed you graphically with stronger and more frequent lines who spoke to who
// 18:40 <&cr0sis> also how about people who use the same words, and also people who use the same words that are also unique to those people
};
