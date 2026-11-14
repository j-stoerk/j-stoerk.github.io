/* Pixel Earth and a drag-driven solar scene. No library, WebGL or idle animation. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  window.PortfolioOrbit = function (canvas, sky, repaint) {
    var ctx = canvas.getContext('2d'), space = sky.getContext('2d');
    var buffer = document.createElement('canvas'); buffer.width = buffer.height = 96;
    var pixel = buffer.getContext('2d'), frame = pixel.createImageData(96,96), normals = [];
    var texture, textureWidth, textureHeight, image = new Image();
    for (var py=0; py<96; py++) for (var px=0; px<96; px++) {
      var nx=(px-47.5)/47, ny=(47.5-py)/47, square=nx*nx+ny*ny;
      if (square>1) continue;
      var nz=Math.sqrt(1-square), tilt=.23;
      normals.push({offset:(py*96+px)*4,x:nx,y:ny,z:nz,
        u:Math.atan2(nx,nz*Math.cos(tilt)-ny*Math.sin(tilt))/TAU+.5,
        v:.5-Math.asin(ny*Math.cos(tilt)+nz*Math.sin(tilt))/Math.PI});
    }
    image.onload=function () {
      var map=document.createElement('canvas'); map.width=image.width; map.height=image.height;
      var mapCtx=map.getContext('2d'); mapCtx.drawImage(image,0,0);
      texture=mapCtx.getImageData(0,0,map.width,map.height).data;
      textureWidth=map.width; textureHeight=map.height; repaint();
    };
    image.src=canvas.dataset.earthTexture;

    this.geometry=function (state) {
      var sun={x:state.width*.46,y:state.height*.53,r:(state.width<600?23:34)*state.reveal};
      var tilt=.63, dx=state.x-sun.x, dy=(sun.y-state.y)/tilt;
      return {sun:sun,tilt:tilt,radius:Math.max(20,Math.hypot(dx,dy)),angle:Math.atan2(dy,dx)};
    };
    function size(context, element, w, h) {
      var dpr=Math.min(devicePixelRatio||1,2), pw=Math.round(w*dpr),ph=Math.round(h*dpr);
      if(element.width!==pw||element.height!==ph){element.width=pw;element.height=ph;}
      context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);
    }
    function orb(context,x,y,r,colors,rings) {
      if(rings){context.strokeStyle=colors[1];context.lineWidth=1;context.beginPath();context.ellipse(x,y,r*1.85,r*.5,-.35,0,TAU);context.stroke();}
      var step=Math.max(1.4,r/9);
      for(var yy=-r;yy<r;yy+=step)for(var xx=-r;xx<r;xx+=step){
        if(xx*xx+yy*yy>r*r)continue;
        context.fillStyle=colors[xx+yy<0?0:1];context.fillRect(x+xx,y+yy,step+.2,step+.2);
      }
    }
    this.draw=function (state, holes) {
      var geom=this.geometry(state), sun=geom.sun, reveal=state.reveal;
      var style=getComputedStyle(canvas), ink=style.getPropertyValue('--color-primary').trim();
      var muted=style.getPropertyValue('--color-text-muted').trim(), dark=document.documentElement.dataset.theme==='dark';
      size(space,sky,state.width,state.height);
      if(reveal>0){
        space.globalAlpha=reveal;
        for(var star=0;star<58;star++){
          var sx=((star*167.13)%1)*state.width,sy=((star*97.71+.19)%1)*state.height;
          space.fillStyle=ink;space.globalAlpha=reveal*(star%7===0?.22:.09);
          space.fillRect(sx,sy,star%7===0?2:1,star%7===0?2:1);
        }
        var bodies=[
          {name:'Mercury',scale:.32,phase:1.4,speed:2.2,r:2.5,colors:['#b6b2a8','#797d85']},
          {name:'Venus',scale:.65,phase:3.5,speed:1.4,r:4,colors:['#cbb18b','#9f825e']},
          {name:'Earth',scale:1,phase:geom.angle,speed:0,r:0,colors:[]},
          {name:'Mars',scale:1.4,phase:.5,speed:.7,r:3.4,colors:['#c18e77','#966c5c']},
          {name:'Jupiter',scale:1.95,phase:5,speed:.36,r:10,colors:['#c2ac91','#998777']},
          {name:'Saturn',scale:2.5,phase:5.3,speed:.24,r:8,colors:['#c6b899','#9b907b'],rings:true},
          {name:'Uranus',scale:3,phase:4.5,speed:.15,r:5,colors:['#9bbabd','#718e9b']},
          {name:'Neptune',scale:3.45,phase:4.9,speed:.1,r:5,colors:['#729aca','#486c9e']}
        ];
        bodies.forEach(function(body){
          // Compressed outer distances give the near-Earth view a readable depth.
          var scale=body.scale/(1+.48*Math.max(0,body.scale-1)),r=geom.radius*scale;
          space.globalAlpha=reveal*(body.name==='Earth'?.34:.12);space.strokeStyle=ink;space.lineWidth=body.name==='Earth'?1:.7;
          space.beginPath();space.ellipse(sun.x,sun.y,r,r*geom.tilt,0,0,TAU);space.stroke();
          if(!body.r)return;
          var angle=body.phase+state.phase*body.speed,bx=sun.x+Math.cos(angle)*r,by=sun.y-Math.sin(angle)*r*geom.tilt;
          space.globalAlpha=reveal*.85;orb(space,bx,by,body.r,body.colors,body.rings);
          if(body.scale>1.5){space.font='9px ui-monospace, monospace';space.fillStyle=muted;space.fillText(body.name,bx+body.r+7,by+3);}
        });
        space.globalAlpha=reveal*.12;space.fillStyle='#cda65c';space.beginPath();space.arc(sun.x,sun.y,sun.r+10,0,TAU);space.fill();
        space.globalAlpha=reveal;orb(space,sun.x,sun.y,sun.r,dark?['#e8c77a','#c59850']:['#d5b369','#b38b48']);
        space.font='10px ui-monospace, monospace';space.fillStyle=muted;space.textAlign='center';space.fillText('Sun',sun.x,sun.y+sun.r+18);space.textAlign='start';
        // Keep stars, orbital paths and labels out of the readable text itself.
        space.globalAlpha=1;space.globalCompositeOperation='destination-out';
        holes.forEach(function(box){space.fillRect(box.x-3,box.y-1,box.width+6,box.height+2);});
        space.globalCompositeOperation='source-over';
      }
      space.globalAlpha=1;
      var side=state.radius*2,radius=state.radius-9;
      size(ctx,canvas,side,side);
      var lx=-.6,ly=.6,lz=.75;
      if(reveal>.05){lx=(sun.x-state.x)/geom.radius;ly=(state.y-sun.y)/geom.radius;lz=.55;}
      var length=Math.hypot(lx,ly,lz);lx/=length;ly/=length;lz/=length;
      frame.data.fill(0);
      normals.forEach(function(n){
        var u=((n.u+state.rotation/TAU)%1+1)%1, v=Math.max(0,Math.min(.999,n.v));
        var index=(Math.floor(v*(textureHeight||1))*(textureWidth||1)+Math.floor(u*(textureWidth||1)))*4;
        var light=.23+.77*Math.max(0,n.x*lx+n.y*ly+n.z*lz);
        light=Math.round(light*12)/12;
        frame.data[n.offset]=(texture?texture[index]:44)*light;
        frame.data[n.offset+1]=(texture?texture[index+1]:96)*light;
        frame.data[n.offset+2]=(texture?texture[index+2]:146)*light;
        frame.data[n.offset+3]=255;
      });
      pixel.putImageData(frame,0,0);ctx.imageSmoothingEnabled=false;
      ctx.drawImage(buffer,state.radius-radius,state.radius-radius,radius*2,radius*2);
      ctx.strokeStyle=ink;ctx.globalAlpha=.3;ctx.lineWidth=1;ctx.beginPath();ctx.arc(state.radius,state.radius,radius+1.2,0,TAU);ctx.stroke();
      ctx.globalAlpha=.08;ctx.lineWidth=3;ctx.beginPath();ctx.arc(state.radius,state.radius,radius+3,0,TAU);ctx.stroke();ctx.globalAlpha=1;
    };
  };
})();
