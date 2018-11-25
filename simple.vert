
attribute vec2 a_position;

uniform mat4 u_projection;
uniform mat4 u_modelview;

varying vec2 v_position;

void main(void) {
  gl_Position = u_projection * u_modelview * vec4(a_position, 0., 1.);
  v_position  = gl_Position.xy;
}
