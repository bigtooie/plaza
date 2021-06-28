
const g: any =
{
    title: "/acg/ Plaza",
    version: "1.0.0",

    // the number of bytes of characters to display of an ID.
    // 5 is about 6~7 characters
    // while this doesnt change the db, it will invalidate all links
    // to users or sessions
    id_length: 5,

    // the number of result entries per page, e.g. search results
    results_per_page: 12,

    // the path to the api
    api_root: '/api/',

    // the path to the socket
    socket_path: '/sock/',

    // maybe disable in production
    admin_can_make_users_admin: false,

    server:
    {
        port: 42069,

        // garbage collection of expired login sessions (in hours)
        login_session_gc_interval: 1,

        runtime_settings_file: "rt.json",

        privkey: '/etc/letsencrypt/live/plaza.tooie.net/privkey.pem',
        cert: '/etc/letsencrypt/live/plaza.tooie.net/cert.pem',
        chain: '/etc/letsencrypt/live/plaza.tooie.net/chain.pem',

        database:
        {
            name: "plaza"
            // configure the rest of the DB in server/secret/secret.ts
        },

        logging:
        {
            enabled: true,

            // trace, debug, info, warn, error, fatal, silent
            level: 'debug',
        }
    },

    debug:
    {
        // set to false for production
        console_output: true,

        // generates test data on server start
        generate_test_data: true,
        test_users: 10000,
        test_sessions: 1000,

        // logs in automatically as user 'test' with password 'test'
        auto_login: false
    }
};

export { g };
