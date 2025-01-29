const socket = io('ws://localhost:8080');

const GAMELENGTH = 3600; // default game time in seconds
let time = GAMELENGTH;
let timeRunning = false;
let scores = {
    home: 0,
    away: 0
}

initTeamSelect();

// TRIGGERS

const inputs = {
    scoreButtons: document.querySelectorAll('.btn-score'),
    timeoutButtons: document.querySelectorAll('.btn-timeout'),
    timeButtons: document.querySelectorAll('.btn-time'),
    nameInputs: document.querySelectorAll('.inp_teamName'),
    colorInputs: document.querySelectorAll('.inp_teamColor'),
    toggleDetails: document.querySelector('.btn-toggle-details'),
    toggleScoreboard: document.querySelector('.btn-toggle-scoreboard'),
    toggleLogo: document.querySelector('.btn-toggle-logo')
};

const labels = {
    scores: document.querySelectorAll('.score-team'),
    minutes: document.querySelector('.minutes'),
    seconds: document.querySelector('.seconds')
};

const indicators = {
    overtime: document.querySelector('.overtime-indicator'),
    notification: document.querySelector('.notification')
};

const customProperties = document.documentElement.style;

[...inputs.scoreButtons].forEach(button => {
    const team = button.dataset.team;
    const action = button.dataset.action;
    button.addEventListener('click', () => {
        socket.emit('score:change', team, action);
    });
});

[...inputs.timeoutButtons].forEach(button => {
    const team = button.dataset.team;
    button.addEventListener('click', () => {
        socket.emit('timeout:toggle', team);
    });
});

[...inputs.timeButtons].forEach(button => {
    const action = button.dataset.action;

    button.addEventListener('click', () => {
        if (action === 'adjust') {
            const value = document.querySelector('.input-time-adjust').value;
            return socket.emit('time:change', action, value)
        }

        socket.emit('time:change', action);
    });
});

[...inputs.nameInputs].forEach(input => {
    const team = input.dataset.team;
    input.addEventListener('input', () => {
        socket.emit('name:change', team, input.value);
    });
});

[...inputs.colorInputs].forEach(input => {
    const team = input.dataset.team;
    input.addEventListener('change', () => {
        socket.emit('color:change', team, input.value);
    });
});

inputs.toggleDetails.addEventListener('click', () => {
    socket.emit('details:toggle');
});

inputs.toggleScoreboard.addEventListener('click', () => {
    socket.emit('scoreboard:toggle');
  });

inputs.toggleLogo.addEventListener('click', () => {
    socket.emit('logo:toggle');
  });

// LISTENERS

socket.on('state:update', (state) => {
    scores = state.scores;
    time = state.time;
    timeRunning = state.timeRunning;

    updateScores();
    updateTime();
    updateTeamNames(state.teamNames);
    updateTeamColors(state.teamColors);
    toggleDetails(state.detailsVisible);
    toggleScoreboard(state.scoreboardVisible);
    toggleLogo(state.logoVisible);
    updateTimeoutIndicators(state.timeout);
});

socket.on('score:change', (team, action) => {
    const scoreElements = [...labels.scores].filter(elem => elem.dataset.team === team);
    let previousScore = scores[team];
  
    switch (action) {
      case 'add':
        scores[team] += 1;
        break;
      case 'sub':
        if (scores[team] < 1) return;
        scores[team] -= 1;
        break;
      case 'reset':
        scores[team] = 0;
        break;
      default:
        break;
    }
  
    scoreElements.forEach(elem => {
      if (scores[team] > previousScore) {
        elem.textContent = previousScore;
        
        elem.classList.add('animate-score-increase');
        
        setTimeout(() => {
          elem.textContent = scores[team];
        }, 250);
  
        setTimeout(() => {
          elem.classList.remove('animate-score-increase');
        }, 500);
  
      } else if (scores[team] < previousScore) {
        elem.textContent = previousScore;
  
        elem.classList.add('animate-score-decrease');
  
        setTimeout(() => {
          elem.textContent = scores[team];
        }, 250);
  
        setTimeout(() => {
          elem.classList.remove('animate-score-decrease');
        }, 500);

      } else {
        elem.textContent = scores[team];
      }
    });
  });

socket.on('timeout:toggle', team => {
    document.querySelector('.timeout-indicator').classList.toggle(team);
    [...inputs.timeoutButtons].filter(button => button.dataset.team === team)[0].classList.toggle('active');
});

socket.on('time:change', (action, value) => {
    switch (action) {
        case 'toggle':
            timeRunning = !timeRunning;
            handleTimeStartButtonLabel();
            break;
        case 'reset':
            timeRunning = false;
            time = GAMELENGTH;
            resetTimeIndicators();
            break;
        case 'adjust':
            if (!value) return;

            const valueNumbers = '000' + value.replaceAll(/[^0-9]/g, '');

            const seconds = parseInt(valueNumbers.slice(-2));
            const minutes = parseInt(valueNumbers.slice(-4, -2));

            setTime = minutes * 60 + seconds;
            if (seconds > 59 || setTime > GAMELENGTH) return;

            time = setTime;
            document.querySelector('.input-time-adjust').value = '';
            break;
        default:
            break;
    }
    socket.emit('time:update', time, timeRunning);
});

socket.on('name:change', (team, value) => {
    [...document.querySelectorAll(`.name-team[data-team='${team}']`)].forEach(elem => {
        if (elem.dataset.abbr) {
            elem.textContent = value.slice(0, 3);
            return;
        }
        elem.textContent = value;

        if (elem.closest('.match-details')) {
            if (value.length > 13) {
                elem.style.fontSize = `${(value.length > 20 ? 45 : 46) - value.length}px`;
                return;
            }
            elem.style.fontSize = '';
        }
    });
});

socket.on('color:change', (team, value) => {
    customProperties.setProperty(team === 'home' ? '--home-color' : '--away-color', value);
});

socket.on('details:toggle', () => {
    document.querySelector('.match-details').classList.toggle('clear');
});

socket.on('scoreboard:toggle', (visible) => {
    toggleScoreboard(visible);
});

socket.on('time:update', (updatedTime, isRunning) => {
    time = updatedTime;
    timeRunning = isRunning;
    updateTime();
    handleTimeStartButtonLabel();
});

function initTeamSelect() {
    ['home', 'away'].forEach((team) => {
        const placeholderElement = document.querySelector(
            `[data-${team}-team-name]`
        );
        const teamOptionsTemplate = [...document
            .querySelector('[data-team-select]')
            .content.children];

        if (!placeholderElement || !teamOptionsTemplate) return;
        placeholderElement.setAttribute('data-target', `name-team-${team}`);

        teamOptionsTemplate.forEach(option => {
            placeholderElement.insertAdjacentElement('beforeEnd', option.cloneNode(true));
        });
    });
}

function handleTimeStartButtonLabel() {
    const timeStartButton = [...inputs.timeButtons].filter(button => button.dataset.action === 'toggle')[0];
    timeStartButton.textContent = timeRunning ? 'Pause' : 'Start';
}

function resetTimeIndicators() {
    Object.keys(indicators).forEach(key => indicators[key].classList.add('clear'));
    handleTimeStartButtonLabel();
}

function updateScores() {
    Object.keys(scores).forEach(team => {
        [...labels.scores].filter(elem => elem.dataset.team === team).forEach(elem => elem.textContent = scores[team]);
    });
}

function updateTime() {
    const minutes = Math.floor(Math.abs(time / 60));
    const seconds = Math.floor(Math.abs(time % 60));
    labels.minutes.textContent = `0${minutes}`.slice(-2);
    labels.seconds.textContent = `0${seconds}`.slice(-2);
}

function updateTeamNames(teamNames) {
    Object.keys(teamNames).forEach(team => {
        [...document.querySelectorAll(`.name-team[data-team='${team}']`)].forEach(elem => {
            if (elem.dataset.abbr) {
                elem.textContent = teamNames[team].slice(0, 3);
                return;
            }
            elem.textContent = teamNames[team];

            if (elem.closest('.match-details')) {
                if (teamNames[team].length > 13) {
                    elem.style.fontSize = `${(teamNames[team].length > 20 ? 45 : 46) - teamNames[team].length}px`;
                    return;
                }
                elem.style.fontSize = '';
            }
        });
    });
}

function updateTeamColors(teamColors) {
    Object.keys(teamColors).forEach(team => {
        customProperties.setProperty(team === 'home' ? '--home-color' : '--away-color', teamColors[team]);
    });
}

function toggleDetails(visible) {
    if (visible) {
        document.querySelector('.match-details').classList.remove('clear');
    } else {
        document.querySelector('.match-details').classList.add('clear');
    }
}

function toggleScoreboard(visible) {
    const overview = document.querySelector('.match-overview');
    if (!overview) return;
  
    if (visible) {

      overview.classList.remove('hide-scoreboard');
    } else {
      overview.classList.add('hide-scoreboard'); 
    }
}

function toggleLogo(visible) {
    const logo = document.getElementById('logo');
    if (!logo) return;

    if (visible) {
        logo.classList.remove('hidden');
    } else {
        logo.classList.add('hidden');
    }
}

function updateTimeoutIndicators(timeout) {
    Object.keys(timeout).forEach(team => {
        if (timeout[team]) {
            document.querySelector('.timeout-indicator').classList.add(team);
            [...inputs.timeoutButtons].filter(button => button.dataset.team === team)[0].classList.add('active');
        } else {
            document.querySelector('.timeout-indicator').classList.remove(team);
            [...inputs.timeoutButtons].filter(button => button.dataset.team === team)[0].classList.remove('active');
        }
    });
}