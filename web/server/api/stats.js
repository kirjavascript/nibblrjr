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

    app.get('/api/stats/base', (_req, res) => {
        const serversOnline = parent.servers
            .map(({ address, channels }) => ({
                address,
                channels: channels.map(channel => channel.name),
            }));

        res.json({
            count: commands.count(),
            serversOnline,
            uptime: 0 | (new Date() - parent.epoch) / 36e5,
        });
    });

    function getStat(statement) {
        return databases.reduce((acc, { db, name }) => {
            acc.push(
                ...db.prepare(statement).all().map(obj => ({
                    ...obj,
                    server: name,
                }))
            )
            return acc;
        }, []);
    }

    app.get('/api/stats/activity', (_req, res) => {
        res.json(getStat(`
            SELECT user, count(lower(user)) as count
            FROM log
            WHERE 1
            AND time BETWEEN date('now', '-1 month') AND date('now')
            GROUP BY lower(user)
            ORDER BY count DESC
            LIMIT 10
        `));
    });

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
    //
    // most run commands

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

// http://buffy.myrealm.co.uk/afsmg/stats/
    //https://chanstat.net/stats/rizon/%23homescreen
    // hardcode cake^ -> Kirjava

    // number of commands served
    // most kicked
    // questions asked
    // yelling
    // most mentioned person
    // semtiment analysis
    // activity time
    // I also want to see people who join the most compared to people who stay online
// URL linkers
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
// 21:33 <+IckleFinn> Kirjava: If you give me a csv with timestamp, user, message I might do some random machine learning on it
// 10:56 <nibblrjr1> <Kirjava> track nick changes stats with nibblr (also maybe use it to work out nick groups (1 day ago)


};
