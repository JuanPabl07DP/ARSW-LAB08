package edu.eci.arsw.collabpaint;

import edu.eci.arsw.collabpaint.model.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

@Controller
public class STOMPMessagesHandler {

    @Autowired
    SimpMessagingTemplate msgt;

    // Mapa concurrente para almacenar los puntos de cada dibujo
    private Map<String, List<Point>> drawingsPoints = new ConcurrentHashMap<>();

    @MessageMapping("/newpoint.{numdibujo}")
    public void handlePointEvent(Point pt, @DestinationVariable String numdibujo) throws Exception {
        System.out.println("Nuevo punto recibido en el servidor!:" + pt);

        // Reenviar el punto a todos los clientes suscritos al tópico de puntos
        msgt.convertAndSend("/topic/newpoint." + numdibujo, pt);

        // Obtener o crear la lista de puntos para este dibujo
        drawingsPoints.putIfAbsent(numdibujo, new CopyOnWriteArrayList<>());
        List<Point> points = drawingsPoints.get(numdibujo);

        // Añadir el nuevo punto a la lista
        points.add(pt);

        // Si hay 4 o más puntos, crear y publicar un polígono
        if (points.size() >= 4) {
            // Crear un objeto que contenga los puntos del polígono
            // Para simplificar, usaremos un array de los primeros 4 puntos
            List<Point> polygonPoints = points.subList(0, 4);

            // Publicar el polígono en el tópico de polígonos
            msgt.convertAndSend("/topic/newpolygon." + numdibujo, polygonPoints);

            // Limpiar los puntos usados
            points.clear();
        }
    }
}