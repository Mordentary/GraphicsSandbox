#version 450 core

in vec4 Color;
in vec3 Normal;
in vec2 TexCoord;

uniform sampler2D uTex0;

out vec4 oColor;

void main(void)
{
    vec3 normal = normalize(-Normal);
    float diffuse = max(dot(normal, vec3(0, 0, -1)), 0.0);
    oColor = texture(uTex0, TexCoord) * Color * diffuse;
}
