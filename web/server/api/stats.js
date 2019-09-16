const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

module.exports = function({ parent, app }) {

    const { commands } = parent.database;

    const storagePath = path.join(__dirname, '../../../storage');
    const databases = fs.readdirSync(storagePath)
        .map(file => {
            const db = new Database(path.join(storagePath, file));
            return [path.parse(file).name, db];
        })
        .filter(([_, db]) => (
            db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='log';`).get()
        ));

    databases.forEach(([name, db]) => {
        console.log(
            db.prepare(`
                SELECT user, count(lower(user))
                FROM log
                WHERE lower(target)="#code"
                AND time BETWEEN date('now', '-7 day') AND date('now')
                GROUP BY user
                ORDER BY count(lower(user)) DESC
                LIMIT 10
                ;
            `)
                .all()
        )
    });

    app.get('/api/stats/commands', (_req, res) => {
        const serversOnline = parent.servers
            .map(({ address, channels }) => ({
                address,
                channels: channels.map(channel => channel.name),
            }));

        // TODO: uptime
        res.json({
            count: commands.count(),
            serversOnline,
            databases
        });
    });
// http://buffy.myrealm.co.uk/afsmg/stats/
    //https://chanstat.net/stats/rizon/%23homescreen
    // hardcode cake^ -> Kirjava

    // number of commands served
    // most mentioned person
    // semtiment analysis
    // activity time
    // I also want to see people who join the most compared to people who stay online
    //
// URL linkers
// 21:02 <mordini> ~who
// 21:02 <+IckleFinn> Longest average message
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
