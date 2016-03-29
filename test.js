/**
 * Created by Pashka on 27.03.2016.
 */

(function testGame() {

    var globals = {
        // размер шарика
        cellDimension: 44,
        borderWidth: 2
    }

/// drag-n-drop event dispatcher
/// Принимает события перетаскивания и отправляет информацию подписантам
/// На событие move подписаны шарики, на up и down - диспетчер размещения шарика
    function eventDispatcher() {

        // параметры перетаскиваемого шарика
        this.draggedBall = {};
        //subscribe item prototype
        this.subscribeItemPrototype = {id: null, subscriber: undefined, callback: undefined, eventsList: []};
        // array of subscribe items
        this.subscribersArray = [];

        // send event to subscribers function. if subscriberID === null send to all subscribers
        this.sendToSubscribers = function (subscriberID, params, event) {
            // for each subscribe items
            this.subscribersArray.forEach(function (item) {
                if (item.id === subscriberID || subscriberID === null) {

                    item.eventsList.forEach(function (eventItem) {
                        if (event === eventItem)
                            item.callback.call(item.subscriber, params);
                    });
                }
            });
        }
        // добавляем информацию о подписке в список
        this.subscribe = function (id, subscriber, callback, events) {

            var item = Object.create(this.subscribeItemPrototype);
            item.id = id;
            item.subscriber = subscriber;
            item.callback = callback;
            item.eventsList = events;

            this.subscribersArray.push(item);
        }

        // тут немного грязный код - для разных событий отправляем разные данные. Надо унифицировать
        this.mouseDownListener = function (e) {

            if (e.which !== 1)
                return;

            var elem = e.target.closest('.draggable');
            if (!elem)
                return;

            this.draggedBall.elem = elem;
            this.draggedBall.domID = elem.id;
            this.draggedBall.startX = e.pageX;
            this.draggedBall.startY = e.pageY;
            this.sendToSubscribers(null, {ballID: this.draggedBall.domID}, "down");
        }

        this.mouseMoveListener = function (e) {

            if (!this.draggedBall.elem)
                return;

            this.sendToSubscribers(this.draggedBall.domID, {x: e.pageX - (globals.cellDimension>>1), y: e.pageY - (globals.cellDimension>>1)}, "move");
        }

        this.mouseUpListener = function (e) {
            this.sendToSubscribers(null, {ball: this.draggedBall, x: e.pageX, y: e.pageY}, "up");
            this.draggedBall = {};
        }

        if (document.ontouchstart) {
            document.ontouchstart = this.mouseDownListener.bind(this);
            document.ontouchmove = this.mouseMoveListener.bind(this);
            document.ontouchend = this.mouseUpListener.bind(this);
        }
        else {
            document.onmousedown = this.mouseDownListener.bind(this);
            document.onmousemove = this.mouseMoveListener.bind(this);
            document.onmouseup = this.mouseUpListener.bind(this);
        }
    }

/// забирает перемещаемый шарик с его игрового поля, сохраняет его
/// и при окончании d'N'd размещает на подходящем игровом поле
    function ballDispatcher(gameFields) {

        this.movingBall = undefined;
        this.lastPosition = {};
        this.gameFields = (gameFields === undefined) ? [] : gameFields;

        /// забираем шарик с игрового поля и запоминаем его
        this.getBallFromField = function (params) {
            // ищем на игровых полях шарик по его ID
            var this_ = this;
            this.gameFields.forEach(
                function (gameField) {
                    var ball;
                    if (ball = gameField.findBallByID(params.ballID)) {
                        this_.movingBall = ball;
                        this_.lastPosition = ball.pos;
                        gameField.getBallFromId({id: params.ballID});
                        return;
                    }
                }
            );
        }

        /// находим подходящее поле по координатам и кладем туда ранее взятый шарик
        this.putBallToField = function (params, recursive) {

            var pos = {x: params.x, y: params.y};
            var this_ = this;
            this.gameFields.forEach(function (gameField) {

                if (gameField.isInField(pos)) {
                    gameField.addBallAbsPosition(this_.movingBall, pos); // сюда смещение
                    this_.movingBall = undefined;
                    this_.lastPosition = {};
                }
            });

            // если шарик был брошен не на поле
            if (this.movingBall !== undefined) {
                // кладем его по предыдущему месту нахождения
                if (recursive !== false)
                    this.putBallToField({x: this.lastPosition.x, y: this.lastPosition.y}, false);
            }

        }

        /// подписываем объект на события "взяли шарик" (нажали кнопку) и "положили шарик" (отпустили кнопку)
        this.initDragNDrop = function (dispatcher, subscribeCallback) {
            subscribeCallback.call(dispatcher, null, this, this.getBallFromField, ["down"]);
            subscribeCallback.call(dispatcher, null, this, this.putBallToField, ["up"]);
            return this;
        }
    }

/// ball class
/// use ptototype cause it may be necessary in further
    function gameBall(parent, id) {

        this.parent = parent;
        this.domID = id;
        return this;
    }

    gameBall.prototype.parent = undefined;
    gameBall.prototype.elementDOM = undefined;
    gameBall.prototype.pos = {x: null, y: null};
    gameBall.prototype.isShown = false;
    gameBall.prototype.showAt = function (pos) {

        if (pos.x === undefined && pos.y === undefined)
            return this;

        if (!this.isShown) {
            var d = document.createElement('div');
            d.id = this.domID;
            d.className = "ball draggable";
            d.style.position = "absolute";
            d.style.zIndex = 99;
            this.elementDOM = d;
            this.isShown = true;
            this.parent.appendChild(d);
        }

        this.moveTo({x: pos.x, y: pos.y});

        return this;
    }

    gameBall.prototype.moveTo = function (position) {
        this.elementDOM.style.top = position.y + "px";
        this.elementDOM.style.left = position.x + "px";
        this.pos = position;
        return this;
    }

    gameBall.prototype.move = function (offset) {
        if (offset.x == undefined || offset.y == undefined)
            return;

        this.moveTo({x: this.pos.x + offset.x, y: this.pos.y + offset.y});
        return this;
    }

    // подписка. коллбек задается извне
    gameBall.prototype.initDragNDrop = function (dispatcher, subscribeCallback) {
        subscribeCallback.call(dispatcher, this.domID, this, this.moveTo, ["move"]);
        return this;
    }

    gameBall.prototype.addToField = function (field, posInField) {
        field.addBall(this, posInField);
        return this;
    }


    /// Класс игрового поля. Поле принимает шарики. При перетаскивании шарик сначала изымается, затем добавляется
    function gameField(parent, id) {
        this.parent = parent;
        this.domID = id;
        this.width = 400;
        this.height = 400;
        this.position = {x: 0, y: 0};
        this.ballsArray = [];
        return this;
    }


    gameField.prototype.showAt = function (pos) {
        var x = 0, y = 0;
        if (pos !== undefined) {
            x = pos.x;
            y = pos.y;
            this.position = pos;
        }

        var d = document.createElement('div');
        d.id = this.domID;
        d.className = "game-field";
        d.style.position = "absolute";
        d.style.left = x + "px";
        d.style.top = y + "px";
        d.style.width = this.width + "px";
        d.style.height = this.height + "px";
        this.elementDOM = d;
        this.parent.appendChild(d);

        return this;
    }

    /// Проверка, попадают ли координаты в рамки поля
    gameField.prototype.isInField = function (pos) {

        if ((pos.x > (this.position.x + this.width)) || (pos.y > (this.position.y + this.height)))
            return false;

        if ((pos.x < this.position.x) || (pos.y < this.position.y))
            return false;

        return true;
    }

    /// Помещаем шарик в поле, используя глобальные координаты
    gameField.prototype.addBallAbsPosition = function (ball, pos) {

        var x = pos.x - this.position.x;
        var y = pos.y - this.position.y;

        this.addBall(ball, {x: x, y: y});

    }

    /// Помещаем шарик в поле, используя координаты относительно top-left угла поля
    gameField.prototype.addBall = function (ball, posInField) {

        if (ball === undefined)
            return;

        var cellDimension = globals.cellDimension;
        var borderWidth = 2 * globals.borderWidth

        if (posInField.x + (cellDimension) > this.width) {
            posInField.x = this.width - cellDimension;
        }

        if (posInField.y + (cellDimension) > this.width) {
            posInField.y = this.width - (cellDimension);
        }

        var x = this.position.x + posInField.x;
        var y = this.position.y + posInField.y;

        this.ballsArray.push(ball.showAt({x: x, y: y}));
        return this;
    }

    /// Ищем в списке шариков поля шарик по его Id
    gameField.prototype.findBallByID = function (id) {

        var ball;
        for (var i = 0; i < this.ballsArray.length; i++) {
            if (this.ballsArray[i].domID === id) {
                ball = this.ballsArray[i];
                break;
            }
        }

        return ball;
    }

    /// Изымаем шарик из поля
    gameField.prototype.getBallFromId = function (params) {

        if (params.id === undefined)
            return;

        var index;
        for (var i = 0; i < this.ballsArray.length; i++) {
            if (this.ballsArray[i].domID === params.id) {
                index = i;
                break;
            }
        }

        if (index !== undefined) {
            this.ballsArray.splice(index, 1);
        }
    }

    /// сохраняем массив с шариками в localStorage
    gameField.prototype.exportBalls = function(name){
        localStorage[name] = JSON.stringify(this.ballsArray);
        return this;
    }

    /// забираем массив с шариками из localStorage и отрисовываем их
    gameField.prototype.importBalls = function(name){
        var loadedBalls = JSON.parse(localStorage[name]);
        var this_ = this;
        loadedBalls.forEach(
          function(loadedBall){
              var ball = new gameBall(this_.parent, loadedBall.domID);
              ball.isShown = false;
              this_.addBall(ball, {x:(loadedBall.pos.x-this_.position.x), y:(loadedBall.pos.y-this_.position.y)});
              //ball.addToField(this_,loadedBall.pos);
          }
        );
        return this;
    }

    gameField.prototype.initDragNDrop = function (dispatcher, subscribeCallback) {
        //subscribeCallback.call(dispatcher, this.domID, this, this.getBallFromId, ["down"]);
        return this;
    }


    /// Игровое поле с "летающими" шариками
    function liveGameField(parent, id) {
        this.parent = parent;
        this.domID = id;
        this.width = 400;
        this.height = 400;
        this.position = {x: 0, y: 0};
        this.ballsArray = [];
        this.movingVectors = [
            {x: 8, y: -8},
            {x: 8, y: 8},
            {x: -8, y: -8},
            {x: 8, y: 8}
        ];
        return this;
    }

    liveGameField.prototype = Object.create(gameField.prototype);
    liveGameField.prototype.vectorsForBalls = {};

    /// Запуск таймера с функцией перемещения шариков
    liveGameField.prototype.startTimer = function () {
        var this_ = this;
        setInterval(
            function () {
                for (var i = 0; i < this_.ballsArray.length; i++) {

                    this_.ballsArray[i].move(this_.vectorsForBalls[this_.ballsArray[i].domID]);
                    this_.correctNextMoving(this_.ballsArray[i], this_.vectorsForBalls[this_.ballsArray[i].domID]);
                }
            }
            , 100);
    }

    /// Отработка отражений от стенок
    liveGameField.prototype.correctNextMoving = function (ball, vector) {

        var cellDimension = globals.cellDimension;
        var nextY = ball.pos.y + vector.y;
        if (nextY < this.position.y) {
            vector.y *= -1;
        }
        else if (nextY + cellDimension > this.position.y + this.width) {
            vector.y *= -1;
        }

        var nextX = ball.pos.x + vector.x;
        if (nextX < this.position.x) {
            vector.x *= -1;
        }
        else if (nextX + cellDimension > this.position.x + this.width) {
            vector.x *= -1;
        }

        return;

    }

    /// Перегрузили функцию прототипа - добавляем к шарику вектор перемещения
    liveGameField.prototype.addBall = function (ball, posInField) {

        // пока направление движения выбираем случайным образом из 2х вариантов
        var index = Math.random() > 0.5 ? 0 : 1;

        // используем для направления движения один из ранее заданных векторов
        // делаем копию, чтобы не испортить исходный при смене направления
        this.vectorsForBalls[ball.domID] = Object.create(this.movingVectors[index]);
        gameField.prototype.addBall.apply(this, arguments);
    }

    /// Начальная установка шариков на первом поле
    function generateBalls() {
        var num = 12;
        for (var i = 0; i < num; i++) {
            // создаем шарик и подписываем его через globalDispatcher на событие перемещения
            var ball = new gameBall(body, "ball_" + i.toString()).initDragNDrop(globalDispatcher, globalDispatcher.subscribe);
            ball.addToField(gameField1, {x: ((i < 9) ? (i * 44) : (i * 44 - 8 * 44)) + 4, y: (i < 9) ? 10 : 60 });
        }
    }

    var body = document.body;
    var globalDispatcher = new eventDispatcher();
    var gameField1 = new gameField(body, "GF1").showAt({x: 40, y: 40});
    var gameField2 = new liveGameField(body, "GF2").showAt({x: 640, y: 40});

    if (localStorage["field1"] !== undefined && localStorage["field2"] !== undefined) {
        gameField1.importBalls("field1");
        gameField1.ballsArray.forEach(function(ball){
            ball.initDragNDrop(globalDispatcher, globalDispatcher.subscribe)
        });

        gameField2.importBalls("field2");
        gameField2.ballsArray.forEach(function(ball){
            ball.initDragNDrop(globalDispatcher, globalDispatcher.subscribe)
        });
    }
    else
       generateBalls();

    var globalBallDispatcher = new ballDispatcher([gameField1, gameField2]).initDragNDrop(globalDispatcher, globalDispatcher.subscribe);
    gameField2.startTimer();

    gameField1.initDragNDrop(globalDispatcher, globalDispatcher.subscribe);
    gameField2.initDragNDrop(globalDispatcher, globalDispatcher.subscribe);

    window.onbeforeunload = function(){
        gameField2.exportBalls("field2");
        gameField1.exportBalls("field1");
    }

}())