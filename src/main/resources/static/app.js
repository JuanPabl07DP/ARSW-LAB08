var app = (function () {

    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }

    var stompClient = null;
    var drawingId = null;

    var addPointToCanvas = function (point) {
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        console.log("Dibujando punto en: x=" + point.x + ", y=" + point.y);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.stroke();
    };

    var drawPolygon = function(points) {
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        console.log("Dibujando polígono con puntos:", points);

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        // Conectar con el resto de puntos
        for (var i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        // Cerrar el polígono conectando con el primer punto
        ctx.lineTo(points[0].x, points[0].y);

        // Estilo del polígono
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rellenar con color semitransparente
        ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
        ctx.fill();

        // Restaurar estilo de dibujo para puntos
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
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

        // Obtener el ID del dibujo
        drawingId = document.getElementById("drawingId").value;

        if (!drawingId) {
            alert("Por favor ingrese un ID de dibujo válido");
            return false;
        }

        var socket = new SockJS('/stompendpoint');
        stompClient = Stomp.over(socket);

        // Añadir logs de depuración
        stompClient.debug = function(str) {
            console.log(str);
        };

        stompClient.connect({}, function (frame) {
            console.log('Connected: ' + frame);

            // Suscripción al tópico de nuevos puntos
            var pointTopic = '/topic/newpoint.' + drawingId;
            stompClient.subscribe(pointTopic, function (eventbody) {
                console.log('Punto recibido en ' + pointTopic + ':', eventbody.body);
                var point = JSON.parse(eventbody.body);
                addPointToCanvas(point);
            });

            // Suscripción al tópico de nuevos polígonos
            var polygonTopic = '/topic/newpolygon.' + drawingId;
            stompClient.subscribe(polygonTopic, function (eventbody) {
                console.log('Polígono recibido en ' + polygonTopic + ':', eventbody.body);
                var points = JSON.parse(eventbody.body);
                drawPolygon(points);
            });

            console.log('Suscripciones completadas');
            document.getElementById("status").innerText = "Conectado al dibujo #" + drawingId;
            document.getElementById("connectBtn").disabled = true;
            document.getElementById("drawingId").disabled = true;

            // Habilitar los eventos del canvas solo después de conectarse
            setupCanvasEvents();

            return true;
        }, function(error) {
            // Callback de error de conexión
            console.error("Error de conexión STOMP:", error);
            document.getElementById("status").innerText = "Error de conexión";
            return false;
        });

        return true;
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

            // Ya no nos conectamos automáticamente
            // Ahora esperamos a que el usuario haga clic en el botón "Conectarse"

            console.log("Inicialización completa");
        },

        connect: function() {
            return connectAndSubscribe();
        },

        publishPoint: function (px, py) {
            var pt = new Point(px, py);
            console.info("publishing point at " + pt.x + ", " + pt.y);

            // Dibujar el punto localmente
            addPointToCanvas(pt);

            // Verificar que el cliente STOMP esté conectado
            if (stompClient && stompClient.connected) {
                // Enviar al endpoint del controlador
                var destination = '/app/newpoint.' + drawingId;
                stompClient.send(destination, {}, JSON.stringify(pt));
                console.log("Punto enviado por STOMP a " + destination);
            } else {
                console.error("Error: STOMP no está conectado, no se puede enviar el punto");
            }
        },

        disconnect: function () {
            if (stompClient !== null) {
                stompClient.disconnect();
                document.getElementById("status").innerText = "Desconectado";
                document.getElementById("connectBtn").disabled = false;
                document.getElementById("drawingId").disabled = false;
            }
            console.log("Disconnected");
        }
    };

})();

// Inicializar la aplicación cuando se carga la página
document.addEventListener("DOMContentLoaded", function() {
    app.init();
});