document.addEventListener('DOMContentLoaded', (event) => {
    // Resize canvasdiv
    function adjustCanvasDivHeight() {
        var navbarHeight = document.querySelector('.navbar').offsetHeight;
        var canvasDiv = document.getElementById('canvasdiv');
        canvasDiv.style.height = `calc(100vh - ${navbarHeight}px)`;
    }
    window.onload = adjustCanvasDivHeight;
    window.onresize = adjustCanvasDivHeight;

    // create canvas
    var canvas = document.getElementById('canvas');
    const container = document.getElementById('canvasdiv');
    var ctx = canvas.getContext('2d');
    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // game
    var config = {
        type: Phaser.AUTO,
        width: canvas.width,
        height: canvas.height,
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };
    
    /*var game = new Phaser.Game(config);
    
    function preload () {
    }
    
    function create () {
    }
    
    function update () {
    }*/
    
});
