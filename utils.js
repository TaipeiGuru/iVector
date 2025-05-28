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
    },
    checkBounds: function(worldX, worldY, bounds) {
        return (
            worldX < bounds.x ||
            worldX > bounds.x + bounds.width ||
            worldY < bounds.y ||
            worldY > bounds.y + bounds.height
        );
    },
    createNewAircraft: function(scene, aircraft, scale, centerX, centerY, inbound) {
        aircraft.setScale(scale);
        if (inbound) { 
            aircraft.altitude = 100 * Math.floor(Math.random() * 80 + 40);
            aircraft.airspeed = Math.floor(Math.random() * 100 + 200);
            let selectedApproach = document.getElementById('approachSelect').value;
            aircraft.approach = selectedApproach || 'ILS'; // fallback to ILS
            if (aircraft.altitude < 10000 && aircraft.airspeed > 250) {
                aircraft.airspeed = 250;
            }
        } else {
            aircraft.angle = 270;
            aircraft.altitude = 500;
            aircraft.targetAltitude = 3000;
            aircraft.airspeed = 200;
        }
        aircraft.setInteractive();
        aircraft.label = scene.add.text(aircraft.x, aircraft.y - 30, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        aircraft.isCleared = false;
        aircraft.lookForAirport = false;
        aircraft.isEstablished = false;
        aircraft.startedDescent = false;
        aircraft.hasInSight = false;
        aircraft.handedOff = false;
        aircraft.runway = null;
        aircraft.labelVisible = true;
        if (inbound) this.orientToField(aircraft, centerX, centerY); 
        aircraft.currentHeading = aircraft.angle;
        aircraft.targetHeading = aircraft.angle;
        this.adjustMovement(aircraft);
    }
};
