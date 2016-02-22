'use strict';

var GameController = function(board, passBtn, key, black, white) {
    var notice;
    var title = black + ' vs. ' + white + ' - Go';
    var cells = board.getElementsByClassName('cell');
    for (var i=0; i<cells.length; i++) {
        cells[i].addEventListener('click', clickHandler);
    }
    if (passBtn && black && white) {
        var failedAttempts = 0, timer, turn;
        var color = localStorage.getItem(key);
        if (color) {
            document.getElementById('color_'+color).checked = true;
            board.classList.remove('inactive');
            board.classList.add(color == 1 ? 'black' : 'white');
        }
        document.forms[0].color[0].addEventListener('change', setColor);
        document.forms[0].color[1].addEventListener('change', setColor);
        passBtn.addEventListener('click', pass);
    }
    connect();

    function connect() {
        var proto = document.location.protocol == 'https:' ? 'wss://' : 'ws://';
        var wsurl = proto + window.location.host + '/live' + window.location.pathname.replace('watch', 'game');
        var socket = new WebSocket(wsurl);
        socket.onmessage = messageHandler;
        socket.onclose = closeHandler;
        socket.onopen = function() {
            clearInterval(timer);
            document.title = black + ' vs. ' + white + ' - Go';
            failedAttempts = 0;
            if (color) board.classList.remove('disabled');
            console.info('WebSocket connected');
        };
    }

    function messageHandler(event) {
        var g = JSON.parse(event.data);
        if (g.Last === 'f') document.location.reload();

        document.getElementById('turn').textContent = g.Turn;
        document.getElementById('blackscr').textContent = g.BlackScr;
        document.getElementById('whitescr').textContent = g.WhiteScr;
        for (var y=0; y<g.Board.length; y++) {
            for (var x=0; x<g.Board[y].length; x++) {
                var cell = cells[y*g.Board.length+x];
                var piece = cell.children[1];
                switch (g.Board[y][x]) {
                    case 1: piece.classList.add('black'); break;
                    case 2: piece.classList.add('white'); break;
                    default:
                        piece.classList.remove('black', 'white');
                        piece.classList.add('hide');
                }
                if (g.Last == x * 19 + y) {
                    piece.classList.add('last');
                } else {
                    piece.classList.remove('last');
                }
            }
        }

        if (2 - g.Turn % 2 == color) {
            notice = document.createElement('div');
            notice.className = 'notice';
            notice.textContent = 'Your turn!';
            document.body.insertBefore(notice, document.getElementById('title'));
            if (!document.hasFocus()) flashTitle();
        }
    }

    function insertPiece(cell, color) {
        var piece = document.createElement('div');
        piece.className = 'piece ' + color;
        cell.appendChild(piece);
    }

    function flashTitle() {
        var flashTimer = setInterval(function() {
            if (document.title == title) document.title = 'Your Turn - ' + title;
            else document.title = title;
        }, 1000);
        window.addEventListener('focus', function() {
            clearInterval(flashTimer);
            document.title = title;
        });
    }

    function closeHandler(event) {
        if (failedAttempts == 0) {
            document.title = 'Reconnecting';
            timer = setInterval(function() {
                if (document.title.length < 15) document.title += '.';
                else document.title = 'Reconnecting';
            }, 1000);
        }
        var wait = Math.round(Math.pow(failedAttempts++, 1.5) + 1);
        setTimeout(connect, wait * 1000);
        board.classList.add('disabled');
        console.warn('WebSocket closed, attempt ' + failedAttempts + ', reconnecting in ' + wait + 's');
    }

    // Save color selection in local storage and log error if it fails
    function setColor(event) {
        color = this.value;
        board.classList.remove('inactive', 'black', 'white');
        board.classList.add(this.dataset.color);
        try {
            localStorage.setItem(key, color);
        } catch (e) {
            console.error('Local storage is not available.');
        }
    }

    function clickHandler(event) {
        if (board.classList.contains('disabled') || board.classList.contains('inactive')) return;
        if (!color) return;

        var x = indexOf(this);
        var y = indexOf(this.parentNode);
        var url = window.location.href;
        var data = 'color=' + color + '&x=' + x + '&y=' + y;
        ajax('PATCH', url, data, response);
    }

    function pass(event) {
        if (board.classList.contains('disabled') || board.classList.contains('inactive')) return;
        if (!color) return;

        var data = 'color=' + color + '&pass=true';
        ajax('PATCH', window.location.href, data, response);
    }

    function response() {
        if (this.status >= 300) alert(this.response);
        if (notice) notice.remove();
    }
}
