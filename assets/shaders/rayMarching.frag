#version 450 core

out vec4 FragColor;
in vec2 vTexCoord;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 iCameraPos;

const int MAX_STEPS = 100;
const float MIN_DIST = 0.001;
const float MAX_DIST = 100.0;
const float EPSILON = 0.001;

// Primitive SDFs
float sphereSDF(vec3 p, vec3 center, float radius) {
    return length(p - center) - radius;
}

float boxSDF(vec3 p, vec3 center, vec3 size) {
    vec3 d = abs(p - center) - size;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float torusSDF(vec3 p, vec3 center, float radius, float thickness) {
    p -= center;
    vec2 q = vec2(length(p.xz) - radius, p.y);
    return length(q) - thickness;
}

float sceneSDF(vec3 p) {
    // Ground plane
    float ground = p.y + 1.0;
    
    // Animated sphere
    vec3 sphereCenter = vec3(2.0 * sin(iTime), 0.0, 2.0 * cos(iTime));
    float sphere1 = sphereSDF(p, sphereCenter, 1.0);
    
    // Static sphere
    float sphere2 = sphereSDF(p, vec3(-2.0, 0.0, 0.0), 1.5);
    
    // Box
    float box = boxSDF(p, vec3(0.0, 0.0, -2.0), vec3(1.0));
    
    // Torus
    float torus = torusSDF(p, vec3(0.0, 0.0, 0.0), 2.0, 0.5);
    
    // Combine all objects using smooth min
    float scene = min(ground, sphere1);
    scene = min(scene, sphere2);
    scene = min(scene, box);
    scene = min(scene, torus);
    
    return scene;
}

vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
        sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
        sceneSDF(vec3(p.x, p.y, p.z + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
    ));
}

float rayMarch(vec3 ro, vec3 rd) {
    float totalDist = 0.0;
    
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + totalDist * rd;
        float dist = sceneSDF(p);
        
        if (dist < MIN_DIST) {
            return totalDist;
        }
        
        totalDist += dist;
        
        if (totalDist > MAX_DIST) {
            return MAX_DIST;
        }
    }
    
    return MAX_DIST;
}

vec3 calculateLighting(vec3 p, vec3 normal) {
    vec3 lightPos = vec3(5.0, 5.0, 5.0);
    vec3 lightDir = normalize(lightPos - p);
    
    // Ambient
    float ambient = 0.1;
    
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    
    // Specular
    vec3 viewDir = normalize(iCameraPos - p);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    
    // Shadow ray marching
    float shadow = 1.0;
    vec3 shadowRayStart = p + normal * MIN_DIST * 2.0;
    float distToLight = length(lightPos - shadowRayStart);
    vec3 shadowRayDir = lightDir;
    
    float shadowDist = rayMarch(shadowRayStart, shadowRayDir);
    if (shadowDist < distToLight) {
        shadow = 0.2;
    }
    
    // Material colors based on position
    vec3 color;
    if (p.y < -0.9) { // Ground
        color = vec3(0.2, 0.3, 0.4);
    } else if (length(p - vec3(2.0 * sin(iTime), 0.0, 2.0 * cos(iTime))) < 1.1) { // Animated sphere
        color = vec3(1.0, 0.5, 0.2);
    } else if (length(p - vec3(-2.0, 0.0, 0.0)) < 1.6) { // Static sphere
        color = vec3(0.2, 0.8, 0.4);
    } else if (abs(p.x) < 1.1 && abs(p.y) < 1.1 && abs(p.z + 2.0) < 1.1) { // Box
        color = vec3(0.8, 0.2, 0.4);
    } else { // Torus
        color = vec3(0.4, 0.4, 0.8);
    }
    
    return color * (ambient + shadow * (diff + spec));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
    
    // Camera setup
    vec3 ro = vec3(0.0, 2.0, 6.0);
    vec3 rd = normalize(vec3(uv, -1.5));
    
    float dist = rayMarch(ro, rd);
    vec3 color;
    
    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 normal = estimateNormal(p);
        color = calculateLighting(p, normal);
    } else {
        // Sky gradient
        color = mix(vec3(0.5, 0.7, 1.0), vec3(0.2, 0.3, 0.5), uv.y * 0.5 + 0.5);
    }
    
    // Basic tone mapping
    color = color / (color + vec3(1.0));
    
    FragColor = vec4(color, 1.0);
}
