/*
 * Copyright (c) 2018, Ben Barsdell. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived
 *   from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#ifdef GL_ES
precision highp float;
#endif

#define NUM_USER_LENSES 10

uniform float     u_kappa_c;
uniform float     u_gamma_c;
uniform int       u_lens_count;
uniform vec2      u_lens_pos[NUM_USER_LENSES];
uniform float     u_lens_mass;
uniform sampler2D u_texture;

varying vec2 v_position;

float rand(float x) {
  return fract(sin(x * 12.9898) * 43758.5453);
}
vec2 rand2(float x) {
  return vec2(fract(sin(x * 12.9898) * 43758.5453),
              fract(sin(x * 78.2330) * 43758.5453));
}

void main(void) {
  // Compute convergence and shear effects of continuous matter
  float kc = u_kappa_c;
  float gc = u_gamma_c;
  vec2 scaling = vec2(1.0-kc-gc, 1.0-kc+gc);
  vec2 inv_scaling = 1. / scaling;

  // Compute deflection and shear due to point lenses
  vec2 deflection = vec2(0.0, 0.0);
  vec2 shear      = vec2(0.0, 0.0);
  int n = u_lens_count;
  const int max_lens_count = 256;

  vec2 position = v_position;
  position.y *= -1.; // HACK TESTING

  for( int i=0; i<max_lens_count; ++i ) {
    if( i == n ) {
      break;
    }
    // Generate random lens positions
    vec2 lens = rand2(float(i) * (1. / float(max_lens_count))) * 2. - 1.;
    lens *= 3.;
    if( i < NUM_USER_LENSES ) {
      // This is a user-movable lens
      lens = u_lens_pos[i];
    }
    // Compute the deflection
    vec2 r = lens - position * inv_scaling;
    float r2 = dot(r, r);
    // Note: We normalize by n to give fixed total mass
    float mass = u_lens_mass * (1. / float(n));
    mass *= 0.5; // HACK TESTING
    float eps = 0.;//1e-2;
    r2 += eps * eps;
    deflection += mass * r / r2;
    // Compute the shear
    float m_on_r4 = mass / (r2 * r2);
    shear += vec2((r.y * r.y - r.x * r.x) * m_on_r4,
                  2.0 * r.x * r.y * m_on_r4);
  }

  vec2 g = shear;
  float k = 1.0 - kc;
  g.x += gc;
  float magnification = 0.25 / (k * k - dot(g, g));

  // Apply the deflection to the texture coordinates
  vec2 texcoord = position + deflection;
  texcoord = 0.5 * (texcoord + 1.); // [-1:1] -> [0:1]
  vec4 color = texture2D(u_texture, texcoord);
  float m = 100. * abs(magnification);
  color.w = m;

  gl_FragColor = color;
}
