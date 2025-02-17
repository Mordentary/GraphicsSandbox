#version 450 core

out vec4 FragColor;
in vec2 vTexCoord;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 iCameraPos;
uniform mat4 iCameraInvView;   
uniform mat4 iCameraInvProj;  

const int MAX_STEPS = 100;
const float MIN_DIST = 0.00001;
const float MAX_DIST = 100.0;
const float EPSILON = 0.001;

// -------- Simplex Noise Functions (3D) --------
// Description: 3D simplex noise, based on Ashima Arts’ implementation.

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0/289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0/289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
{
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, vec3(C.y)));
    vec3 x0 = v - i + dot(i, vec3(C.x));

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g, l.zxy);
    vec3 i2 = max(g, l.zxy);

    // x0, x1, x2, x3: offsets for the four corners
    vec3 x1 = x0 - i1 + C.x;
    vec3 x2 = x0 - i2 + 2.0 * C.x;
    vec3 x3 = x0 - 1.0 + 3.0 * C.x;

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.y;
    vec4 y = y_ *ns.x + ns.y;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 g0 = vec3(a0.x, a0.y, h.x);
    vec3 g1 = vec3(a0.z, a0.w, h.y);
    vec3 g2 = vec3(a1.x, a1.y, h.z);
    vec3 g3 = vec3(a1.z, a1.w, h.w);

    // Normalize gradients
    vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));
    g0 *= norm.x;
    g1 *= norm.y;
    g2 *= norm.z;
    g3 *= norm.w;

    // Mix contributions from the four corners
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3)));
}

//------------------------RAYMARCHING-----------------------------//

float smoothMin(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5*(d2 - d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0 - h);
}

float planeSDF( vec3 p, vec3 n, float h )
{
  return dot(p,n) + h;
}

// --- SDF functions for scene primitives ---
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


// --- Scene SDF ---
float sceneSDF(vec3 p) {
    // Ground plane
	float ground = planeSDF(p,vec3(0,1,0),1.0f);
    
    // Animated sphere
    
    vec3 sphereCenter = vec3(2.0 * sin(iTime), 0.0, 2.0 * cos(iTime));
    float sphere1 = sphereSDF(p, sphereCenter, 1.0);
    


    // Static sphere
    float sphere2 = sphereSDF(p, vec3(-2.0, 0.0, 0.0), 1.5);
 

 
    // Box
    float box = boxSDF(p, vec3(0.0, 0.0, -2.0), vec3(1.0));
    
    // Torus
    float torus = torusSDF(p, vec3(0.0, 0.0, 0.0), 2.0, 0.5);
    
    float scene = smoothMin(ground, sphere1, 0.5f);
    scene = smoothMin(scene, sphere2, 0.5f);
    scene = smoothMin(scene, box, 0.5f);
    scene = smoothMin(scene, torus, 0.5f);
   
  
    return scene;
}

// --- Estimate normal at point p ---
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

// --- Lighting calculation ---
vec3 calculateLighting(vec3 p, vec3 normal) {
//    vec3 lightPos = vec3(5.0, 5.0, 5.0);
//    vec3 lightDir = normalize(lightPos - p);
//    
//    // Ambient lighting
//    float ambient = 0.1;
//    
//    // Diffuse lighting
//    float diff = max(dot(normal, lightDir), 0.0);
//    
//    // Specular lighting
//    vec3 viewDir = normalize(iCameraPos - p);
//    vec3 reflectDir = reflect(-lightDir, normal);
//    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
//    
//    // Simple shadow computation
//    float shadow = 1.0;
//    vec3 shadowRayStart = p + normal * MIN_DIST * 2.0;
//    float distToLight = length(lightPos - shadowRayStart);
//    float shadowDist = rayMarch(shadowRayStart, lightDir);
//    if (shadowDist < distToLight) {
//        shadow = 0.2;
//    }
//    
//    // Determine object color based on position
//    vec3 color;
//    if (p.y < -0.9) { // Ground
//        color = vec3(0.2, 0.3, 0.4);
//    } else if (length(p - vec3(2.0 * sin(iTime), 0.0, 2.0 * cos(iTime))) < 1.1) { // Animated sphere
//        color = vec3(1.0, 0.5, 0.2);
//    } else if (length(p - vec3(-2.0, 0.0, 0.0)) < 1.6) { // Static sphere
//        color = vec3(0.2, 0.8, 0.4);
//    } else if (abs(p.x) < 1.1 && abs(p.y) < 1.1 && abs(p.z + 2.0) < 1.1) { // Box
//        color = vec3(0.8, 0.2, 0.4);
//    } else { // Torus
//        color = vec3(0.4, 0.4, 0.8);
//    }
//    
//    return color * (ambient + shadow * (diff + spec));

    float amplitude = 1.0f;
//	vec3 color;
	float n = snoise(vec3(2.0 * p.x, 2.0* p.y, p.z + iTime));
	n = n * 0.5 + 0.5; 
	n = n * amplitude; 
	vec3 color = vec3(n);
	return color;
}

void main() 
{
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
    
    vec3 ro = iCameraPos;
    
    vec4 rayClip = vec4(uv, -1.0, 1.0);
    
    // Transform clip-space position into view space using the inverse projection matrix
    vec4 rayEye = iCameraInvProj * rayClip;
    // Force the ray direction (we want a direction vector, not a position)
    rayEye = vec4(rayEye.xy, -1.0, 0.0);
    
    // Transform from view space to world space using the inverse view matrix
    vec3 rd = normalize((iCameraInvView * rayEye).xyz);
    
    // --- Raymarching ---
    float dist = rayMarch(ro, rd);
    vec3 color;
    
    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 normal = estimateNormal(p);
        color = calculateLighting(p, normal);
    } else {
        // Background (sky gradient)
        color = mix(vec3(0.5, 0.7, 1.0), vec3(0.2, 0.3, 0.5), uv.y * 0.5 + 0.5);
    }
    
    // Simple tone mapping
    color = color / (color + vec3(1.0));
    
    FragColor = vec4(color, 1.0);
}
