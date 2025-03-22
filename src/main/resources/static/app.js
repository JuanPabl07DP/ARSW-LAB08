var app = (function () {

    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }

    var stompClient = null;

    var addPointToCanvas = function (point) {
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        console.log("Dibujando punto en: x=" + point.x + ", y=" + point.y);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.stroke();
    };

    var getMousePosition = function (evt) {
        var canvas = document.getElementById("canvas");
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    };

    var connectAndSubscribe = function () {
        console.info('Connecting to WS...');
        var socket = new SockJS('/stompendpoint');
        stompClient = Stomp.over(socket);

        // Añadir logs de depuración
        stompClient.debug = function(str) {
            console.log(str);
        };

        stompClient.connect({}, function (frame) {
            console.log('Connected: ' + frame);
            stompClient.subscribe('/topic/newpoint', function (eventbody) {
                console.log('Mensaje recibido:', eventbody.body);
                var point = JSON.parse(eventbody.body);
                addPointToCanvas(point);
            });
            console.log('Suscripción completada al tópico /topic/newpoint');
        }, function(error) {
            // Callback de error de conexión
            console.error("Error de conexión STOMP:", error);
        });
    };

    var setupCanvasEvents = function() {
        var canvas = document.getElementById("canvas");
        if (!canvas) {
            console.error("Error: No se encuentra el elemento canvas");
            return;
        }

        canvas.addEventListener("mousedown", function(evt) {
            var mousePos = getMousePosition(evt);
            console.log("Mouse down detectado en:", mousePos.x, mousePos.y);
            // Usar la referencia correcta a publishPoint
            app.publishPoint(mousePos.x, mousePos.y);
        });
        console.log("Eventos del canvas configurados correctamente");
    };

    return {

        init: function () {
            console.log("Iniciando aplicación...");
            var canvas = document.getElementById("canvas");
            if (!canvas) {
                console.error("Error: No se encuentra el elemento canvas");
                return;
            }
            console.log("Canvas encontrado correctamente");

            // Inicializar conexión websocket
            connectAndSubscribe();
            // Configurar eventos del canvas
            setupCanvasEvents();
            console.log("Inicialización completa");
        },

        publishPoint: function (px, py) {
            var pt = new Point(px, py);
            console.info("publishing point at " + pt.x + ", " + pt.y);

            // Dibujar el punto localmente
            addPointToCanvas(pt);

            // Verificar que el cliente STOMP esté conectado
            if (stompClient && stompClient.connected) {
                // Publicar el punto a otros clientes
                stompClient.send("/topic/newpoint", {}, JSON.stringify(pt));
                console.log("Punto enviado por STOMP");
            } else {
                console.error("Error: STOMP no está conectado, no se puede enviar el punto");
            }
        },

        disconnect: function () {
            if (stompClient !== null) {
                stompClient.disconnect();
            }
            console.log("Disconnected");
        }
    };

})();