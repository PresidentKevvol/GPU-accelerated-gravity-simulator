//a free moving celestial body/entity
class Entity {
    constructor(x, y, mass, color) {
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.color = color;
        this.velocity_x = 0;
        this.velocity_y = 0;
    }
    
    //update the velocity of this entity by applying a force to it
    apply_force(force_v) {
        this.velocity_x += force_v[0] / this.mass;
        this.velocity_y += force_v[1] / this.mass;
    }
    
    //update the position of this entity in a tick
    update_position() {
        this.x += this.velocity_x;
        this.y += this.velocity_y;
    }
    
    //get the simple representation of this entity
    //for feeding into the gpu
    get_simple_rep() {
        return [this.x, this.y, this.mass];
    }
}

const gpu = new GPU();
//the size of the kernel, default to 128?
var kernel_size = 1000;

//gravity constant
var G = 6.6743E-11;

//calculate the distance between two entities
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

//function to calculate the gravitational force b is exerting on a
//the given object is an array of [x, y, mass]
function gravitational_force(ax, ay, amass, bx, by, bmass) {
    //the distance vector from a to b
    let vx = bx - ax;
    let vy = by - ay;
    //r is the distance
    let r = Math.sqrt(vx * vx + vy * vy);
    
    //f is the magnitude of the force a experience currently (b exert on a)
    let f = 6.6743E-11 * amass * bmass / (r * r);
    
    //scale it to the magnitude of the force vector
    if (vx === 0 && vy === 0) {
        return [0.0, 0.0];
    } else {
        return [vx / r * f, vy / r * f];
    }
}

//function to calculate the gravitational force exerted on an entity
//used as a gpu kernel
function calculate_force_vector(entity_array, length) {
    //for the threads exceeded the number of entities we need to compute, just return nothing
    if (this.thread.x >= length) {
        return [0.0, 0.0];
    }
    
    let sum_x = 0;
    let sum_y = 0;
    
    //the entity in focus' x and y coords, and mass
    let self_x = entity_array[this.thread.x][0];
    let self_y = entity_array[this.thread.x][1];
    let self_mass = entity_array[this.thread.x][2];
    
    for (let i=0; i<length; i++) {
        if (i === this.thread.x) {
            continue; //if same index, skip (force on itself == 0)
        } else {
            //the current target entity to calculate the force
            let targ_x = entity_array[i][0];
            let targ_y = entity_array[i][1];
            let targ_mass = entity_array[i][2];
            
            //calculate the force of any other entity exerting on this entity this kernel is calculating
            let force = gravitational_force(self_x, self_y, self_mass, targ_x, targ_y, targ_mass);
            
            //add to the sum vector
            sum_x += force[0];
            sum_y += force[1];
        }
    }
    
    return [sum_x, sum_y];
}

//add the function that need to be used
gpu.addFunction(gravitational_force);

//the settings for the kernel
var gravity_kernel_settings = {
    output: [kernel_size]
};

//the kernel to calculate the total force on each entity due to gravitaty
var kernel_gravity = gpu.createKernel(calculate_force_vector, gravity_kernel_settings);

//function for creating a new kernel if not enough
function create_new_kernel(new_size) {
    kernel_size = new_size;
    gravity_kernel_settings.output = [kernel_size];
    kernel_gravity = gpu.createKernel(calculate_force_vector, gravity_kernel_settings);
}
