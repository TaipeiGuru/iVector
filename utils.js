// utils.js
window.Utils = {
    calculateGameHeight: function() { 
        var navbarHeight = document.querySelector('.navbar').offsetHeight;
        var windowHeight = window.innerHeight;
        return windowHeight - navbarHeight;
    },
    adjustMovement: function(aircraft) {
        let groundspeed = 0.003373155 * aircraft.altitude + aircraft.airspeed;
        let spriteSpeed = (groundspeed / 3128) * 29.1;
        let angleRadians = Phaser.Math.DegToRad(aircraft.angle);
        let velocityX = spriteSpeed * Math.sin(angleRadians);
        let velocityY = -spriteSpeed * Math.cos(angleRadians);
        aircraft.setVelocity(velocityX, velocityY);
    },
    orientToField: function(aircraft, centerX, centerY) {
        var angleToCenter = Math.atan2(centerY - aircraft.y, centerX - aircraft.x);
        var angleDegrees = Phaser.Math.RadToDeg(angleToCenter);
        aircraft.angle = angleDegrees + 90;
    },
    updateGraphics: function(scene, graphics, centerX, centerY, baseRadius, smallRadius, initialZoom) {
        graphics.clear();
        var zoomAdjustmentFactor = scene.cameras.main.zoom / initialZoom;
        var lineThickness = 1.5 / zoomAdjustmentFactor; // Adjusting line thickness inversely to zoom
        var adjustedBaseRadius = baseRadius / zoomAdjustmentFactor;
        var adjustedSmallRadius = smallRadius / zoomAdjustmentFactor;

        graphics.lineStyle(lineThickness, 0x924a49, 1);
        graphics.lineBetween(centerX, centerY, centerX + 300, centerY);
        graphics.lineBetween(centerX, centerY, centerX + 300, centerY + 15);
        graphics.lineBetween(centerX, centerY, centerX + 300, centerY - 15);
        graphics.lineBetween(centerX + 300, centerY - 15, centerX + 300, centerY + 15);
    
        graphics.fillStyle(0x2d86e2, 1);
        graphics.fillCircle(centerX, centerY, adjustedBaseRadius);
        graphics.fillStyle(0x94ee8d, 1);
        graphics.fillCircle(centerX, centerY, adjustedSmallRadius);
    }
};
