const TERRAIN_MAPS = {
    "coastal": {
        name: "Coastal Region",
        zones: [
            {
                name: "Coastal Mountains",
                points: [
                    // Outer boundary (original shape)
                    {x: 800, y: 325}, {x: 930, y: 330}, {x: 1000, y:315}, 
                    {x:1050, y:320}, {x:1100, y:325}, {x:1200, y:350}, {x:1300, y:440}, 
                    {x:1330, y:480}, {x:1370, y:500}, {x:1420, y:510}, {x:1470, y: 500}, 
                    {x:1510, y:450}, {x:1525, y:390}, {x:1500, y:300}, {x:1400, y:250}, 
                    {x:1200, y:225},{x:1000, y:220}, {x:900, y:190}, {x:800, y:150}, 
                    {x:700, y:120}, {x:600, y:140}, {x:550, y:180}, {x:540, y:230}, {x: 550, y: 270}, 
                    {x: 800, y: 325},
                    // Inner boundary (20 pixels inside)
                    {x: 820, y: 305}, {x: 570, y: 250}, {x: 560, y: 200}, {x: 600, y: 160}, 
                    {x: 700, y: 140}, {x: 800, y: 170}, {x: 900, y: 210}, {x: 1000, y: 240}, 
                    {x: 1200, y: 245}, {x: 1400, y: 270}, {x: 1480, y: 310}, {x: 1500, y: 370}, 
                    {x: 1490, y: 430}, {x: 1450, y: 470}, {x: 1400, y: 490}, {x: 1350, y: 480}, 
                    {x: 1320, y: 440}, {x: 1300, y: 400}, {x: 1200, y: 330}, {x: 1100, y: 305}, 
                    {x:1070, y:302},{x: 1065, y: 290}, {x:1070, y:260}, {x:1100, y:242}, 
                    {x:1000, y:240}, {x:970, y:230}, {x: 1000, y: 295}, {x: 930, y: 310}, {x: 820, y: 305}
                ],
                minAltitude: 6000,
                color: 0x9EB271, // Dark olive green
            },
            {
                name: "Coastal Hills",
                points: [
                    {x:970, y:232}, {x:900, y:210}, {x:800, y:170}, {x:700, y:140}, {x:600, y:160},
                    {x:560, y:200}, {x: 570, y: 250}, {x: 820, y: 305}, {x: 930, y: 310}, {x: 1000, y: 295}
                ],
                minAltitude: 2000,
                color: 0x4A993A, // Light green
            },
            {
                name: "Coastal Hills",
                points: [
                    {x:1065, y:290}, {x:1070, y: 302}, {x:1100, y:305}, {x: 1200, y: 330}, {x:1300, y:400}, 
                    {x:1320, y:440}, {x:1350, y:480}, {x:1400, y:490}, {x:1450, y:470}, {x:1490, y:430}, 
                    {x:1500, y:370}, {x:1480, y:310}, {x:1400, y:270}, {x:1200, y:245}, {x:1100, y:243}, 
                    {x:1070, y:260}, {x:1300, y:280}, {x:1430, y:320}, {x:1460, y:360}, {x:1430, y:410}, 
                    {x:1400, y:430}, {x:1360, y:420}, {x:1320, y:390}, {x:1290, y:370}, {x:1250, y:330}, 
                    {x:1250, y:315}, {x:1270, y:290}, {x:1300, y:280}, {x:1070, y:260}
                ],
                minAltitude: 2000,
                color: 0x4A993A, // Light green
            },
            {
                name: "Coastal Hills",
                points: [
                    {x:1270, y:290}, {x:1300, y:280}, {x:1430, y:320}, {x:1460, y:360}, {x:1430, y:410}, 
                    {x:1400, y:430}, {x:1360, y:420}, {x:1320, y:390}, {x:1290, y:370}, {x:1250, y:330}, 
                    {x:1250, y:315}, {x:1270, y:290}
                ],
                minAltitude: 2000,
                color: 0x5AD317, // Light green
            }
        ]
    }
};

window.TERRAIN = {
    createTerrainVisualization: function(scene) {
        const terrainGraphics = scene.add.graphics();
        const currentMap = TERRAIN_MAPS["coastal"];
        
        // Clear previous terrain
        terrainGraphics.clear();
        
        currentMap.zones.forEach(zone => {
            // Base fill
            terrainGraphics.fillStyle(zone.color, 0.4);
            terrainGraphics.beginPath();
            terrainGraphics.moveTo(zone.points[0].x, zone.points[0].y);
            for (let i = 1; i < zone.points.length; i++) {
                terrainGraphics.lineTo(zone.points[i].x, zone.points[i].y);
            }
            terrainGraphics.closePath();
            terrainGraphics.fillPath();
            
            // Border for better visibility
            terrainGraphics.lineStyle(2, zone.color, 0.8);
            terrainGraphics.strokePath();
        });
        
        return terrainGraphics;
    }
};

function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
            (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / 
             (polygon[j].y - polygon[i].y) + polygon[i].x)) {
            inside = !inside;
        }
    }
    return inside;
}