const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');
const { inspect } = require('util');

const storagePath = path.join(__dirname, '../../../storage');
const cachePath = path.join(__dirname, '../../../cache/stats');

module.exports = async ({ parent, app }) => {

    const exists = async (dir) => !!await fs.stat(dir).catch(_err => false);

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

    app.post('/api/stats/base', (req, res) => {
        const { month } = req.body;
        const dateTo = month ? `${month}-01` : 'now'
        // flip
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
            servers,
            uptime: 0 | (new Date() - parent.epoch) / 36e5,
        });
    });

    // cache middleware

    // add migrations to the cached data when changing the format

    const checkRecentCache = (() => {
        const lookup = {};
        return (server, channel) => {
            const now = new Date();
            const key = `${server}-${channel}`;
            if (lookup[key]) {
                if (now - lookup[key] > 36e5) {
                    lookup[key] = now
                    return true;
                }
                return false;
            } else {
                lookup[key] = now;
                return true;
            }
        };
    })();

    app.post('/api/stats/all', async (req, res, next) => {
        const { server = '', channel = '', month = '' } = req.body;
        const filename = `${server}-${channel}-${month}.json`;
        // check user input to limit what can be read!
        if (!/^[a-z.]*-[#%&a-z0-9\/]*-(\d{4}-\d{2}|)\.json$/i.test(filename)) {
            return res.send('{}');
        }
        // space and comma are disallowed in channel names
        const statsPath = path.join(cachePath, filename.replace(/\//g, ' '));
        const staleRecent = !month && checkRecentCache(server, channel);
        if (!staleRecent && await exists(statsPath)) {
            res.type('application/json')
                .send(await fs.readFile(statsPath, 'utf8'));
        } else {
            const { json } = res;
            res.json = function (obj) {
                json.call(this, obj);
                // save to cache if there are any values
                if (Object.values(obj).some(item => item.length !== 0)) {
                    fs.writeFile(statsPath, JSON.stringify(obj), 'utf8');
                }
            };
            next();
        }
    })

    const addMonth = (month) => {
        return month.replace(/(.+)-(.+)/, (_, y, m) => (
            m === '12' ? `${+y+1}-01` : `${y}-${String(+m+1).padStart(2, '0')}`
        ));
    };

    const dedupe = (items, accessor = 'count', sortBy = (a, b) => a[accessor] - b[accessor]) => {
        return items.reduce((acc, cur) => {
            const found = acc.find(d => d[accessor] === cur[accessor]);
            if (found) {
                found.count += cur.count;
            } else {
                acc.push(cur);
            }
            return acc;
        }, []).sort(sortBy);
    };

    function getBest(items = [], accessor = 'count', type = 'max') {
        const cmp = type == 'max' ? 0 : Infinity;
        const max = items.reduce((acc, cur) => Math[type](acc, cur[accessor]), cmp);
        return items.filter(d => d[accessor] === max);
    }

    app.post('/api/stats/all', (req, res) => {
        const { server, channel, month } = req.body;
        const dateTo = month ? `${addMonth(month)}-01` : 'now';
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

        const commands = dedupe(getStat(({ trigger }) => `
            SELECT command_trigger as command, count(command_trigger) as count
            FROM (
                SELECT CASE WHEN instr(message, ' ') <> 0 THEN substr(message, 1, instr(message, ' ')-1) ELSE message END as command_trigger
                FROM log
                WHERE time BETWEEN date(?, '-1 month') AND date(?)
                ${channelStr}
                AND command = 'PRIVMSG'
                AND message LIKE ${inspect(trigger + '%')}
            )
            WHERE command <> ''
            GROUP BY command
            ORDER BY count DESC
            LIMIT 10
        `, [dateTo, dateTo, ...channelArgs]), 'command', (a, b) => b.count - a.count)
            .slice(0, 10).reverse();

        const activityHours = dedupe(getStat(() => `
            SELECT strftime('%H', time) as hour, count(*) as count
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            AND command = 'PRIVMSG'
            ${channelStr}
            GROUP BY hour
        `, [dateTo, dateTo, ...channelArgs]), 'hour');

        const activityDays = dedupe(getStat(() => `
            SELECT strftime('%Y-%m-%d', time) as day, count(*) as count
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            AND command = 'PRIVMSG'
            ${channelStr}
            GROUP BY day
        `, [dateTo, dateTo, ...channelArgs]), 'day');

        const linkItems = dbList.map(({ db, name }) => {
            const activity = db.prepare(`
                SELECT user, count(lower(user)) as count
                FROM log
                WHERE time BETWEEN date(?, '-1 month') AND date(?)
                ${channelStr}
                GROUP BY lower(user)
                ORDER BY count DESC
                LIMIT 10
            `)
                .all([dateTo, dateTo, ...channelArgs])

            const users = activity.map(d => d.user);

            if (!users.length) return [name, activity, []];

            return [name, activity, db.prepare(
                users.map(() => `
                    SELECT user as source, count(*) as count, ? as target
                    FROM log
                    WHERE time BETWEEN date(?, '-1 month') AND date(?)
                    ${channelStr}
                    AND message LIKE ?
                    AND command = 'PRIVMSG'
                    GROUP BY source
                `).join(' UNION ')
            ).all(
                users.flatMap((user) => [
                    user, dateTo, dateTo, ...channelArgs, `%${user}%`,
                ])
            )];
        });

        // crush up the data for storage / interchange
        const links = linkItems.map(([name, activity, links]) => {
            const data = {};
            for ({ source, count, target } of links) {
                if (!data[source]) {
                    data[source] = {};
                }
                data[source][target] = count;
            }
            return [name, activity, data];
        });

        // short stats

        const avgLineLengthHigh = getBest(getStat(() => `
            SELECT user, avg(length(message)) as average
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND message <> ''
            AND command = 'PRIVMSG'
            GROUP BY lower(user)
            ORDER BY average DESC
            LIMIT 1
        `, [dateTo, dateTo, ...channelArgs]), 'average');

        const avgLineLengthLow = getBest(getStat(() => `
            SELECT user, avg(length(message)) as average
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND message <> ''
            AND command = 'PRIVMSG'
            GROUP BY lower(user)
            ORDER BY average ASC
            LIMIT 1
        `, [dateTo, dateTo, ...channelArgs]), 'average', 'min');

        const shouting = getBest(getStat(() => `
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
        `, [dateTo, dateTo, ...channelArgs]));

        const questions = getBest(getStat(() => `
            SELECT user, count(message) as count
            FROM LOG
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND message LIKE '%?%' AND message NOT LIKE '%http%'
            AND command = 'PRIVMSG'
            GROUP BY lower(user)
            LIMIT 1
        `, [dateTo, dateTo, ...channelArgs]));

        const kicks = getBest(getStat(() => `
            SELECT user, count(lower(user)) as count
            FROM log
            WHERE time BETWEEN date(?, '-1 month') AND date(?)
            ${channelStr}
            AND command = 'KICK'
            GROUP BY lower(user)
            ORDER BY count DESC
            LIMIT 10
        `, [dateTo, dateTo, ...channelArgs]));

        const kicked = getBest(getStat(() => `
            SELECT user, count(user) as count
            FROM (
                SELECT substr(message, 1, instr(message, ' ')-1) as user
                FROM log
                WHERE time BETWEEN date(?, '-1 month') AND date(?)
                ${channelStr}
                AND command = 'KICK'
            )
            GROUP BY user
            ORDER BY count DESC
        `, [dateTo, dateTo, ...channelArgs]));

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

};
