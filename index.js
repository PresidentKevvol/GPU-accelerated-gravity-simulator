//the main canvas for drawing the entities
var main_canvas;
//the context object for the canvas
var main_ctx;

//the PRNG object that we can set a seed to
var spawn_rng;

//the width and height of the viewport = width and height of canvas
var view_height;
var view_width;

//the above two / 2, the coordinate of the center of the canvas
var canvas_center_x;
var canvas_center_y;

//the universe's coordinate corresponding to the canvas' center
//i.e. (canvas_center_x, canvas_center_y) on the canvas correspond to (canvas_orig_x, canvas_orig_y) of the universe
//default to 0
var canvas_orig_x = 0;
var canvas_orig_y = 0;
//the scale of the rendering
var render_scale = 1;

//max and min value of scale
var max_scale = 2048;
var min_scale = 1;

//flags keep track of if the mouse is dragging on the canvas
var isMouseDown = false;
var last_offset_x;
var last_offset_y;

//the tick count of the animation, starting from 0
var tick_count = 0;

//number of entities to be spawn
var spawn_entity = 999;

function index_setup(){
    main_canvas = document.getElementById("main-vas");
    main_ctx = main_canvas.getContext("2d");
    
    //set the canvas' size
    reset_canvas_size();
    //add event listener to set it everytime it's changed
    window.addEventListener('resize', reset_canvas_size);
    
    //add the event listener to the start buttom
    document.getElementById("start-btn").addEventListener("click", start_clicked);
}

function reset_canvas_size() {
    //get the size of the viewport
    view_width = document.documentElement.clientWidth;
    view_height = document.documentElement.clientHeight;
    
    //set the drawing width/height to client viewport size
    main_canvas.setAttribute("width", view_width);
    main_canvas.setAttribute("height", view_height);
    //get the center of the canvas
    canvas_center_x = view_width / 2;
    canvas_center_y = view_height / 2;
}

//start the simulation when the start button is clicked
function start_clicked() {
    //first see which mode is selected
    mode = -1;
    var radios = document.getElementsByClassName("mode-radios");
    for (i=0; i<radios.length; i++) {
        if (radios[i].checked) {
            mode = i;
        }
    }
    //the check the particle count
    var particle_count = document.getElementById("particle-count").value;
    //if particle count bigger than kernel size, make a new kernel
    if (particle_count > kernel_size) {
        create_new_kernel(particle_count);
    }
    //then see if the user supplied a random seed
    var randseed = document.getElementById("rand-seed").value;
    if (randseed === "") {
        randseed = Math.random();
    }
    
    //setup and start the animation
    animation_setup(randseed, mode, particle_count);
    document.getElementById("intro").style.display = "none";
    animation_start();
    //allow drag as well
    canvas_add_event_listeners();
}

//these are for draggin on the canvas to move the view
function canvas_mouse_down(event) {
    isMouseDown = true;
    last_offset_x = event.offsetX;
    last_offset_y = event.offsetY;
}
function canvas_mouse_up() { isMouseDown = false;}
function canvas_mouse_move(event) {
    if (isMouseDown) {
        //calculate the change x and y
        //i.e. how much the cursor has moved relative to the last tick of mouse event
        var change_x = last_offset_x - event.offsetX;
        var change_y = last_offset_y - event.offsetY;
        
        //change to displacement factor
        canvas_orig_x += change_x * render_scale;
        canvas_orig_y += change_y * render_scale;
        
        last_offset_x = event.offsetX;
        last_offset_y = event.offsetY;
    }
}
function canvas_on_wheel(event) {
    if (event.deltaY > 0) { //-ve delta y is scroll down
        if (render_scale < max_scale) {
            /*
            //the coordinate in the universe the due center of the canvas is correspond to
            var vas_center_x = canvas_orig_x + canvas_center_x;
            var vas_center_y = canvas_orig_y + canvas_center_y;
            */
            render_scale *= 2;
            document.getElementById("status-scale").innerHTML = render_scale;
        }
    }else if (event.deltaY < 0) { //+ve delta y is scroll up
        if (render_scale > min_scale) {
            render_scale /= 2;
            document.getElementById("status-scale").innerHTML = render_scale;
        }
    }
    
    console.log(event.deltaY);
}

//add the event listeners to the canvas
function canvas_add_event_listeners() {
    main_canvas.addEventListener("mousedown", canvas_mouse_down);
    main_canvas.addEventListener("mouseup", canvas_mouse_up);
    main_canvas.addEventListener("mousemove", canvas_mouse_move);
    
    main_canvas.addEventListener("wheel", canvas_on_wheel);
}

//these are for rendering the animation

var entity_array;
var anim_interval_object;

var colors = ["#ff6666", "#ffaa66", "#ffff66", "#aaff66", "#66ffaa", "#aaaaff", "#aa66ff", "#66aaff"];

function animation_setup(rng_seed, mode, particle_count) {
    //reset the canvas in case we need to
    reset_canvas_size();
    
    //create the prng object
    spawn_rng = new Math.seedrandom(rng_seed);
    
    //call the function to setup the particles
    if (mode === 0){
        setup_spawn_solar_system(particle_count);
    } else if (mode === 1){
        setup_spawn_stars_and_planets(particle_count);
    }
}

var stars_ratio = 0.05;

function setup_spawn_stars_and_planets(particle_count) {
    entity_array = [];
    //the stars and planets
    for (var i=0; i<particle_count; i++) {
        var col, mass;
        
        if (Math.random() < stars_ratio) { //if a star
            col = "#ffff66";
            mass = 20000000000.0 + spawn_rng() * 80000000000.0;
        } else { //if a planet
            col = "#66aaff";
            mass = 20000000.0 + spawn_rng() * 80000000.0;
        }
        
        //var mass = 3000000000.0;
        var enti = new Entity(spawn_rng() * 640 - 320, spawn_rng() * 640 - 320, mass, col);
        enti.velocity_x = spawn_rng() * 0.5 - 0.25;
        enti.velocity_y = spawn_rng() * 0.5 - 0.25;
        entity_array.push(enti);
    }
}

function setup_spawn_solar_system(particle_count) {
    entity_array = [];
    //spawn the 'sun' (the massive entity in the center)
    entity_array.push(new Entity(0, 0, 6000000000000.0, "#ffffff"));
    //the other planets
    for (var i=0; i<particle_count - 1; i++) {
        //var col = colors[Math.floor(Math.random() * colors.length)];
        var col = "#66aaff";
        var mass = 3000000000.0;
        var enti = new Entity(spawn_rng() * 640 - 320, spawn_rng() * 640 - 320, mass, col);
        enti.velocity_x = spawn_rng() * 2 - 1;
        enti.velocity_y = spawn_rng() * 2 - 1;
        entity_array.push(enti);
    }
}

//start the animation
function animation_start() {
    anim_interval_object = setInterval(render_tick, 25);
}

//compute the physics on all entities
//including applying force, updating position, etc.
function calculate_physics() {
    var ay_length = entity_array.length;
    
    //convert the entity array to simple numbers form
    var ay = [];
    for (var i=0; i<ay_length; i++) {
        ay.push(entity_array[i].get_simple_rep());
    }
    
    //console.log(ay);
    
    //run the array through the kernel calculating the gravitational force
    var forces = kernel_gravity(ay, ay_length);
    
    //loop through each entity updating their position
    for (var i=0; i<ay_length; i++) {
        entity_array[i].apply_force(forces[i]);
        entity_array[i].update_position();
    }
}

//transformation function for universe coords -> canvas coords
function coord_trnasform(univ_x, univ_y, c_orig_x, c_orig_y, scale) {
    var x = univ_x - c_orig_x;
    var y = univ_y - c_orig_y;
    
    x /= scale;
    y /= scale;
    
    x += canvas_center_x;
    y += canvas_center_y;
    
    return [x, y];
}

//render the universe on the canvas
function render_on_canvas() {
    //clear the canvas
    main_ctx.clearRect(0, 0, view_width, view_height);
    //loop through each entity
    var ay_length = entity_array.length;
    for (var i=0; i<ay_length; i++) {
        //and draw it on the canvas as a circle
        var cur = entity_array[i];
        
        //take the x and y of the current particle
        var ux = cur.x;
        var uy = cur.y;
        //calculate the canvas coordinate
        var vascor = coord_trnasform(ux, uy, canvas_orig_x, canvas_orig_y, render_scale);
        
        //the particle size is based on scale factor
        var psize = 2;
        if (render_scale >= 64) {
            psize = 1;
        }
        
        main_ctx.beginPath();
        main_ctx.arc(vascor[0], vascor[1], psize, 0, 2 * Math.PI);
        main_ctx.fillStyle = cur.color;
        main_ctx.fill();
    }
}

function render_tick() {
    calculate_physics();
    render_on_canvas();
    //increment tick count
    tick_count++;
    document.getElementById("status-tick-count").innerHTML = tick_count;
}

document.addEventListener("DOMContentLoaded", index_setup);