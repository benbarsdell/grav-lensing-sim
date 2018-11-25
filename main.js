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

/*
  TODO: Clean up the code:
    Use class syntax instead of functions
    Clean up all the application globals, and avoid redundancy with values from GUI
      Use _name for members/globals
    Do proper async (promise-based) shader loading/initialization
  TODO: Implement sharable links by loading/saving control values to HTTP GET string
*/

'use strict';

function initGL(canvas) {
  var gl = null;
  try {
    gl = canvas.getContext("webgl");
  }
  catch( e ) {
    alert("Sorry, there was an error initialising WebGL :" + e.message);
  }
  if( !gl ) {
    alert("Sorry, could not initialise WebGL :(");
  }
  return gl;
}

function inverse_shear_mapping_demo(canvas) {
  var gl;
  gl = initGL(canvas);
  var view_mode = 'mag';
  var active_shader_program;
  var mag_shader_program;
  var img_shader_program;
  var projection = mat4.create();
  var modelview  = mat4.create();
  var texture;

  // Note: The values in this buffer represent unmapped image-plane coords
  var mesh_buffer;
  var quad_buffer;

  var kappa_c;
  var gamma_c;
  var resolution;
  var source_scale = 1.0;
  // Note: This breaks the 1:1 b/w pxls and verts. Could adjust the
  //         resolution to take this into account and achieve 1:1.
  var image_scale_edge_pad = 2.0;
  var raw_image_scale = (1.0 + image_scale_edge_pad) * source_scale;
  var image_scale_x = raw_image_scale;
  var image_scale_y = raw_image_scale;

  var wireframe = false;
  var lens_count = 32;
  // User-movable lenses
  var lens_pos = [
    0.2,  0.5,
    -0.4, -0.5,
    0.6, -0.1,
    -0.6, 0.1,
    0.9, -0.7,
    -0.6, 0.6,
    0.4, 0.8,
    -0.1, -0.3,
    0.5, 0.6,
    0.3, -0.1,
  ];
  var lens_mass = 0.2;
  var move_all_lenses = false;
  var closest_lens = null;

  // GUI event handling
  // ------------------
  var last_x = null;
  var last_y = null;
  var update_lens_pos = function(event) {
    if( mouse_down || touch_down ) {
      if( mouse_down ) {
        var eX = event.pageX - canvas.offsetLeft;
        var eY = event.pageY - canvas.offsetTop;
      } else {
        var eX = event.touches[0].pageX - canvas.offsetLeft;
        var eY = event.touches[0].pageY - canvas.offsetTop;
      }
      var x = 1. * eX / canvas.clientWidth * 2.0 - 1;
      var y = 1. * eY / canvas.clientHeight * 2.0 - 1;
      x *= source_scale;
      y *= source_scale;
      if( move_all_lenses ) {
        if( last_x ) {
          var dx = x - last_x;
          var dy = y - last_y;
          var nlens = lens_pos.length / 2;
          nlens = Math.min(nlens, lens_count);
          for( var i=0; i<nlens; ++i ) {
            lens_pos[2*i + 0] += dx;
            lens_pos[2*i + 1] += dy;
          }
        }
      } else {
        if( last_x ) {
          var dx = x - last_x;
          var dy = y - last_y;
          lens_pos[2*closest_lens + 0] += dx;
          lens_pos[2*closest_lens + 1] += dy;
        }
      }
      last_x = x;
      last_y = y;
      drawScene();
    }
  };
  var start_interaction = function(eX, eY) {
    var x = 1. * eX / canvas.clientWidth  * 2.0 - 1;
    var y = 1. * eY / canvas.clientHeight * 2.0 - 1;
    x *= source_scale;
    y *= source_scale;
    // Find the closest user-movable lens
    var closest_r2 = 1e99;
    var nlens = lens_pos.length / 2;
    nlens = Math.min(nlens, lens_count);
    for( var i=0; i<nlens; i++ ) {
      var lx = lens_pos[i*2 + 0];
      var ly = lens_pos[i*2 + 1];
      var dx = x - lx;
      var dy = y - ly;
      var r2 = dx*dx + dy*dy;
      if( r2 < closest_r2 ) {
        closest_r2 = r2;
        closest_lens = i;
      }
    }
    drawScene();
  };
  var mouse_down = false;
  canvas.onmousedown = function(event) {
    mouse_down = true;
    var eX = event.pageX - canvas.offsetLeft;
    var eY = event.pageY - canvas.offsetTop;
    start_interaction(eX, eY);
  }
  document.onmouseup = function(event) {
    mouse_down = false;
    last_x = null;
    last_y = null;
  }
  document.onmousemove = update_lens_pos;

  var touch_down = false;
  canvas.ontouchstart = function(event) {
    touch_down = true;
    var eX = event.touches[0].pageX - canvas.offsetLeft;
    var eY = event.touches[0].pageY - canvas.offsetTop;
    start_interaction(eX, eY);
  };
  canvas.ontouchend = function(event) {
    touch_down = false;
    last_x = null;
    last_y = null;
  };
  canvas.ontouchmove = update_lens_pos;

  var move_all_lenses_checkbox =
      document.getElementById("MoveAllLensesCheckbox");
  move_all_lenses_checkbox.onchange = function() {
    move_all_lenses = move_all_lenses_checkbox.checked;
  }
  move_all_lenses = move_all_lenses_checkbox.checked;
  var lens_count_input = document.getElementById("LensCount");
  lens_count_input.onchange = function() {
    if( lens_count_input.value > 256 ) {
      lens_count_input.value = 256;
    } else if( lens_count_input.value < 0 ) {
      lens_count_input.value = 0;
    }
    lens_count = lens_count_input.value;
    drawScene();
  }
  lens_count = lens_count_input.value;
  var mass_slider = document.getElementById("MassSlider");
  mass_slider.oninput = function() {
    lens_mass = mass_slider.value;
    drawScene();
  }
  lens_mass = mass_slider.value;
  var kappa_c_slider = document.getElementById("KappaCSlider");
  kappa_c_slider.oninput = function() {
    kappa_c = kappa_c_slider.value;
    drawScene();
  }
  kappa_c = kappa_c_slider.value;
  var gamma_c_slider = document.getElementById("GammaCSlider");
  gamma_c_slider.oninput = function() {
    gamma_c = gamma_c_slider.value;
    drawScene();
  }
  gamma_c = gamma_c_slider.value;
  var wireframe_checkbox = document.getElementById("WireframeCheckbox");
  wireframe_checkbox.onchange = function() {
    var checked = wireframe_checkbox.checked;
    wireframe = checked;
    drawScene();
  }
  wireframe = wireframe_checkbox.checked;
  var mesh_resolution_select = document.getElementById("MeshResolutionSelect");
  mesh_resolution_select.onchange = function(event) {
    var mesh_resolution = parseInt(mesh_resolution_select.value);
    var mesh_coords = genMesh(mesh_resolution, mesh_resolution,
                              image_scale_x, image_scale_y);
    setFloatBuffer(gl, mesh_buffer, mesh_coords,
                   2, gl.STATIC_DRAW);
    drawScene();
  }
  var render_resolution_select = document.getElementById("RenderResolutionSelect");
  render_resolution_select.onchange = function(event) {
    resolution = parseInt(render_resolution_select.value);
    canvas.width = resolution;
    canvas.height = resolution;
    gl.viewportWidth  = resolution;
    gl.viewportHeight = resolution;
    drawScene();
  }
  var resolution = parseInt(render_resolution_select.value);

  var mag_mode_button = document.getElementById("MagModeButton");
  var img_mode_button = document.getElementById("ImgModeButton");
  mag_mode_button.onclick = function() {
    view_mode = 'mag';
    drawScene();
  }
  img_mode_button.onclick = function() {
    view_mode = 'img';
    drawScene();
  }

  canvas.width  = resolution;
  canvas.height = resolution;
  gl.viewportWidth  = resolution;
  gl.viewportHeight = resolution;

  var initShaders = function() {
    var mag_shaders = ["simple-frag", "inverse_shear_mapping-vert"];
    var img_shaders = ["image_warp-frag", "simple-vert"];
    var program_shaders = [mag_shaders, img_shaders];
    var shader_programs = []
    for( var i=0; i<program_shaders.length; ++i ) {
      var sp = buildShaderProgram(gl, program_shaders[i]);

      // Add an atribute for each buffer we will pass in
      sp.a_position = gl.getAttribLocation(sp, "a_position");
      gl.enableVertexAttribArray(sp.a_position);

      // Add uniforms for the projection and modelview matrices
      sp.u_projection  = gl.getUniformLocation(sp, "u_projection");
      sp.u_modelview   = gl.getUniformLocation(sp, "u_modelview");
      sp.u_kappa_c     = gl.getUniformLocation(sp, "u_kappa_c");
      sp.u_gamma_c     = gl.getUniformLocation(sp, "u_gamma_c");
      sp.u_lens_count  = gl.getUniformLocation(sp, "u_lens_count");
      sp.u_lens_pos    = gl.getUniformLocation(sp, "u_lens_pos");
      sp.u_lens_mass   = gl.getUniformLocation(sp, "u_lens_mass");
      sp.u_texture     = gl.getUniformLocation(sp, "u_texture");

      shader_programs.push(sp);
    }
    mag_shader_program = shader_programs[0];
    img_shader_program = shader_programs[1];
  }
  // Generates a plane mesh using a single triangle strip
  var genMesh = function(res_x, res_y, w, h) {
    var mesh_coords = [];
    var x = 0;
    mesh_coords.push((1.0 / res_x - 1) * w,
                     (1.0 / res_y - 1) * h);
    for( var row=0; row<res_y-1; ++row ) {
      for( var col=0; col<res_x-1; ++col ) {
        // Hex mesh (equilateral triangles) or square mesh (isosceles right
        // triangles).
        var enable_hex = true;
        var hex_shift = !(row % 2);
        mesh_coords.push(w*(2.0*(x+0.5 + enable_hex*0.5*hex_shift)/res_x - 1),
                         h*(2.0*(row+1.5)/res_y - 1));
        x -= (row % 2) * 2 - 1;
        mesh_coords.push(w*(2.0*(x+0.5 + enable_hex*0.5*!hex_shift)/res_x - 1),
                         h*(2.0*(row+0.5 - 0.0*(col%2))/res_y - 1));
      }
      mesh_coords.push(w * (2.0 * (x + 0.5) / res_x - 1),
                       h * (2.0 * (row + 1.5) / res_y - 1));
    }
    return mesh_coords;
  }
  var initBuffers = function() {
    // TODO: De-duplicate this code (see mesh_resolution_select.onchange)
    var mesh_resolution_select =
        document.getElementById("MeshResolutionSelect");
    var mesh_resolution = parseInt(mesh_resolution_select.value);
    var mesh_coords = genMesh(mesh_resolution, mesh_resolution,
                              image_scale_x, image_scale_y);
    mesh_buffer = createFloatBuffer(gl, mesh_coords, 2, gl.STATIC_DRAW);
    var quad_coords = [-1., -1., -1., 1., 1., -1., 1., 1.];
    quad_buffer = createFloatBuffer(gl, quad_coords, 2, gl.STATIC_DRAW);
    texture = loadTexture(gl, "images/M51_Whirlpool_Galaxy.jpg");
  }
  // This function passes uniforms into the shader program
  var setUniforms = function() {
    var asp = active_shader_program;
    gl.uniformMatrix4fv(asp.u_projection, false, projection);
    gl.uniformMatrix4fv(asp.u_modelview, false, modelview);

    gl.uniform1f(asp.u_kappa_c, kappa_c);
    gl.uniform1f(asp.u_gamma_c, gamma_c);

    gl.uniform1i(asp.u_lens_count, lens_count);
    gl.uniform2fv(asp.u_lens_pos, lens_pos);
    gl.uniform1f(asp.u_lens_mass, lens_mass);
    var texture_unit = 0;
    gl.uniform1i(asp.u_texture, texture_unit);
    gl.activeTexture(gl.TEXTURE0 + texture_unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }
  var drawScene = function() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);

    mat4.ortho(-source_scale, source_scale,
               source_scale, -source_scale,
               -1.0, 1.0,
               projection);
    mat4.identity(modelview);

    // Set shader program
    var active_vert_buffer;
    if( view_mode == 'mag' ) {
      active_shader_program = mag_shader_program;
      active_vert_buffer = mesh_buffer;
    } else if( view_mode == 'img' ) {
      active_shader_program = img_shader_program;
      active_vert_buffer = quad_buffer;
    } else {
      console.log("INTERNAL ERROR: Invalid view_mode!");
    }
    gl.useProgram(active_shader_program);

    // Pass each buffer into the shader program
    gl.bindBuffer(gl.ARRAY_BUFFER, active_vert_buffer);
    gl.vertexAttribPointer(active_shader_program.a_position,
                           active_vert_buffer.itemSize,
                           gl.FLOAT, false, 0, 0);
    setUniforms();
    if( !wireframe ) {
      // Note: Originally I used drawElements and an index buffer, but
      //         I discovered that this limits the number of verts to
      //         65k. Using drawArrays means having repeated vertices,
      //         but at least we can have unlimited resolution.
      gl.drawArrays(gl.TRIANGLE_STRIP, 0,
                    active_vert_buffer.numItems);
    }
    else {
      // An approximation to wireframe rendering
      gl.drawArrays(gl.LINE_STRIP, 0,
                    active_vert_buffer.numItems);
    }
  }
  var tick = function() {
    drawScene();
  }

  this.execute = function() {
    initShaders();
    initBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);

    tick();
  }

  //var extractLightCurve = function(x0, y0, x1, y1) {
  //  var nchan = 4;
  //  var npixel = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  //  var pixels = new Uint8Array(npixel * nchan);
  //  var p = new Uint8Array(nchan);
  //  for( i=0; i<npixel; ++i ) {
  //    f = 1. * i / npixel;
  //    x = Math.round(x0 + f * (x1 - x0));
  //    y = Math.round(y0 + f * (y1 - y0));
  //    y = gl.viewportHeight - y; // GL uses inverted y axis
  //    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE,
  //                  //pixels.slice(i*nchan, (i+1)*nchan));
  //                  p);
  //    //console.log(p);
  //    //pixels.slice(i*nchan, (i+1)*nchan) = p;
  //    pixels.set(p, i*nchan);
  //  }
  //  //console.log(x0, y0, x1, y1, gl.drawingBufferWidth, gl.drawingBufferHeight);
  //  console.log(pixels);
  //
  //  var lccanvas = document.getElementById("light_curve_canvas");
  //  // *lccanvas.width = lccanvas.clientWidth;
  //  // *lccanvas.height = lccanvas.clientHeight;
  //  var ctx = lccanvas.getContext("2d");
  //  ctx.clearRect(0, 0, canvas.width, canvas.height);
  //  for( c=0; c<nchan; ++c ) {
  //    if(      c == 0 ) { ctx.strokeStyle = "red"; }
  //    else if( c == 1 ) { ctx.strokeStyle = "green"; }
  //    else if( c == 2 ) { ctx.strokeStyle = "blue"; }
  //    else { ctx.strokeStyle = "magenta"; }
  //    ctx.beginPath();
  //    ctx.moveTo(0,0);
  //    for( i=0; i<npixel; ++i ) {
  //      x = 1. * i / npixel * lccanvas.width;
  //      y = (1. - pixels[i*nchan + c] / 255.) * lccanvas.height;
  //      ctx.lineTo(x, y);
  //    }
  //    ctx.stroke();
  //  }
  //}
}

function main() {
    // TODO: Async init, then run
    var canvas = document.getElementById("main_canvas");
    var app = new inverse_shear_mapping_demo(canvas);
    app.execute();
}
