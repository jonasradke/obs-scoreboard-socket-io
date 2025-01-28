const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

// Initial state
let state = {
    scores: {
        home: 0,
        away: 0
    },
    time: 3600,
    timeRunning: false,
    teamNames: {
        home: "Home",
        away: "Away"
    },
    teamColors: {
        home: "#ca2d64",
        away: "#63b3ed"
    },
    detailsVisible: false,
    timeout: {
        home: false,
        away: false
    }
};

io.on('connection', (socket) => {
    console.log('a browser connected');

    // Send the current state to the new client
    socket.emit('state:update', state);

    socket.on('score:change', (team, action) => {
        console.log('score:change', team, action);
        switch (action) {
            case 'add':
                state.scores[team] += 1;
                break;
            case 'sub':
                if (state.scores[team] > 0) state.scores[team] -= 1;
                break;
            case 'reset':
                state.scores[team] = 0;
                break;
        }
        io.emit('score:change', team, action);
    });

    socket.on('timeout:toggle', team => {
        console.log('timeout:toggle', team);
        state.timeout[team] = !state.timeout[team];
        io.emit('timeout:toggle', team);
    });

    socket.on('time:change', (action, value) => {
        console.log('time:change', action, value);
        switch (action) {
            case 'toggle':
                state.timeRunning = !state.timeRunning;
                break;
            case 'reset':
                state.timeRunning = false;
                state.time = 3600;
                break;
            case 'adjust':
                if (value) {
                    const valueNumbers = '000' + value.replaceAll(/[^0-9]/g, '');
                    const seconds = parseInt(valueNumbers.slice(-2));
                    const minutes = parseInt(valueNumbers.slice(-4, -2));
                    const setTime = minutes * 60 + seconds;
                    if (seconds <= 59 && setTime <= 3600) {
                        state.time = setTime;
                    }
                }
                break;
        }
        io.emit('time:update', state.time, state.timeRunning);
    });

    socket.on('name:change', (team, value) => {
        console.log('name:change', team, value);
        state.teamNames[team] = value;
        io.emit('name:change', team, value);
    });

    socket.on('color:change', (team, value) => {
        console.log('color:change', team, value);
        state.teamColors[team] = value;
        io.emit('color:change', team, value);
    });

    socket.on('details:toggle', () => {
        console.log('details:toggle');
        state.detailsVisible = !state.detailsVisible;
        io.emit('details:toggle');
    });
});

setInterval(() => {
    if (state.timeRunning) {
        state.time -= 1;
        io.emit('time:update', state.time, state.timeRunning);
    }
}, 1000);

http.listen(8080, () => console.log('listening on http://localhost:8080'));
