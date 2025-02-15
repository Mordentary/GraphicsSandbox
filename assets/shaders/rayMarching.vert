#version 450 core

// Vertex attributes with explicit locations
layout(location = 0) in vec4 ciPosition;
layout(location = 1) in vec2 ciTexCoord0;

// Uniforms remain the same
uniform mat4 ciModelViewProjection;
uniform mat3 ciNormalMatrix;

// Outputs with explicit locations
 out vec2 vTexCoord;
 out vec4 Color;
 out vec3 Normal;

void main(void)
{
    gl_Position = ciModelViewProjection * ciPosition;
    vTexCoord    = ciTexCoord0;
}
