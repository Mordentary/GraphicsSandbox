#version 450 core

// Vertex attributes with explicit locations
layout(location = 0) in vec4 ciPosition;
layout(location = 1) in vec2 ciTexCoord0;
layout(location = 2) in vec3 ciNormal;
layout(location = 3) in vec4 ciColor;

// Uniforms remain the same
uniform mat4 ciModelViewProjection;
uniform mat3 ciNormalMatrix;

// Outputs with explicit locations
 out vec2 TexCoord;
 out vec4 Color;
 out vec3 Normal;

void main(void)
{
    gl_Position = ciModelViewProjection * ciPosition;
    Color       = ciColor;
    TexCoord    = ciTexCoord0;
    Normal      = ciNormalMatrix * ciNormal;
}
