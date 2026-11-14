/* Schematic heliocentric scene viewed from near the draggable Earth. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var BODIES = [
    {name:'Mercury',orbit:.38,phase:1.1,speed:2.2,r:5},
    {name:'Venus',orbit:.72,phase:3.8,speed:1.35,r:8},
    {name:'Mars',orbit:1.45,phase:-.5,speed:.7,r:7,moons:[
      {name:'Phobos',r:1.8,d:17,phase:.4,speed:3.6},{name:'Deimos',r:1.6,d:25,phase:2.7,speed:2.2}]},
    {name:'Jupiter',orbit:2.1,phase:2.2,speed:.34,r:20,moons:[
      {name:'Io',r:2.6,d:33,phase:.3,speed:3.8},{name:'Europa',r:2.4,d:44,phase:2.1,speed:2.8},
      {name:'Ganymede',r:3.3,d:58,phase:3.6,speed:2},{name:'Callisto',r:3,d:74,phase:5.2,speed:1.4}]},
    {name:'Saturn',orbit:2.85,phase:4.4,speed:.22,r:17,rings:true,moons:[{name:'Titan',r:3.5,d:49,phase:1.1,speed:1.7}]},
    {name:'Uranus',orbit:3.6,phase:1.5,speed:.14,r:11},
    {name:'Neptune',orbit:4.3,phase:5.8,speed:.1,r:11,moons:[{name:'Triton',r:3,d:29,phase:2.4,speed:-1.9}]}
  ];
  var COASTS=(window.PortfolioCoastlines||[]).map(function(line){return line.map(function(point){
    var lon=point[0]*Math.PI/180,lat=point[1]*Math.PI/180,c=Math.cos(lat);
    return [c*Math.sin(lon),-Math.sin(lat),c*Math.cos(lon)];
  });});
  function illumination(context,x,y,r,ink,light){
    if(!light||Math.hypot(light.x,light.y)<.001||!/^#[a-f0-9]{6}$/i.test(ink))return ink;
    var rgb=[parseInt(ink.slice(1,3),16),parseInt(ink.slice(3,5),16),parseInt(ink.slice(5,7),16)].join(',');
    var gradient=context.createLinearGradient(x-r*light.x,y-r*light.y,x+r*light.x,y+r*light.y);
    gradient.addColorStop(0,'rgba('+rgb+',.3)');gradient.addColorStop(.46,'rgba('+rgb+',.64)');gradient.addColorStop(1,'rgba('+rgb+',1)');return gradient;
  }
  function daylight(context,r,light){
    if(!light||Math.hypot(light.x,light.y)<.001||r<7)return;
    var dark=document.documentElement.dataset.theme==='dark';
    var gradient=context.createLinearGradient(-r*light.x,-r*light.y,r*light.x,r*light.y);
    gradient.addColorStop(0,dark?'rgba(0,0,0,.42)':'rgba(28,48,77,.24)');
    gradient.addColorStop(.48,dark?'rgba(0,0,0,.08)':'rgba(28,48,77,.09)');
    gradient.addColorStop(1,dark?'rgba(143,184,247,.19)':'rgba(190,216,250,.025)');
    context.save();context.beginPath();context.arc(0,0,r,0,TAU);context.clip();
    context.globalAlpha=1;context.fillStyle=gradient;context.fillRect(-r,-r,r*2,r*2);context.restore();
  }
  function size(context, element, w, h) {
    var dpr=Math.min(devicePixelRatio||1,2),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
    if(element.width!==pw||element.height!==ph){element.width=pw;element.height=ph;}
    context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);
  }
  function sphere(context,x,y,r,rotation,ink,background,opacity,light) {
    context.save();context.translate(x,y);
    context.beginPath();context.arc(0,0,r,0,TAU);context.fillStyle=background;context.globalAlpha=.94;context.fill();
    daylight(context,r,light);
    context.strokeStyle=illumination(context,0,0,r,ink,light);context.lineWidth=.75;context.globalAlpha=opacity*.38;
    function project(lat,lon){var a=lon+rotation,c=Math.cos(lat);return [r*c*Math.sin(a),-r*Math.sin(lat),c*Math.cos(a)];}
    function trace(points){
      context.beginPath();var active=false;
      points.forEach(function(p){if(p[2]<0){active=false;return;}if(active)context.lineTo(p[0],p[1]);else context.moveTo(p[0],p[1]);active=true;});context.stroke();
    }
    if(r>7){
      for(var lat=-1.05;lat<=1.06;lat+=r>35?.35:.7){
        var parallel=[];for(var lon=-Math.PI;lon<=Math.PI+.04;lon+=.06)parallel.push(project(lat,lon));trace(parallel);
      }
      for(var m=0;m<TAU;m+=r>35?Math.PI/5:Math.PI/3){
        var meridian=[];for(var t=-Math.PI/2;t<=Math.PI/2+.04;t+=.06)meridian.push(project(t,m));trace(meridian);
      }
    }
    context.globalAlpha=opacity;context.lineWidth=r>20?1:.8;
    context.beginPath();context.arc(0,0,r,0,TAU);context.stroke();context.restore();
  }
  window.PortfolioOrbit=function(canvas,sky){
    var ctx=canvas.getContext('2d'),space=sky.getContext('2d');
    this.geometry=function(state){
      // The camera follows Earth's orbital position, not a fixed page centre.
      var angle=2.3+state.phase,yaw=state.phase*.3;
      // Keep a stable, spacious scene instead of shrinking it during long drags.
      var scale=Math.max(220,Math.min(620,state.width*.67));
      var ex=Math.cos(angle),ey=Math.sin(angle),co=Math.cos(yaw),si=Math.sin(yaw);
      function project(orbit,phase){
        var dx=orbit*Math.cos(phase)-ex,dy=orbit*Math.sin(phase)-ey;
        var horizontal=dx*co+dy*si,depth=dy*co-dx*si;
        var perspective=4.8/(4.8+depth*.18);
        return {x:state.x+horizontal*scale*perspective,y:state.y-depth*scale*.48*perspective,depth:depth};
      }
      var sun=project(0,0);sun.r=(state.width<600?21:28)*state.reveal;
      var bodyScale=state.width<600?.85:1;
      var planets=BODIES.map(function(body){
        var p=project(body.orbit,body.phase+state.phase*body.speed);
        var moons=(body.moons||[]).map(function(moon){
          var a=moon.phase+state.phase*moon.speed,d=moon.d*bodyScale*1.7;
          return {name:moon.name,x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d*.5,r:moon.r*bodyScale,d:d};
        });
        return {name:body.name,x:p.x,y:p.y,r:body.r*bodyScale,orbit:body.orbit,rings:body.rings,moons:moons};
      });
      var moonAngle=.45+state.phase*2.1,moonOrbit=state.radius+80;
      var earthMoon={name:'Moon',x:state.x+Math.cos(moonAngle)*moonOrbit,y:state.y-Math.sin(moonAngle)*moonOrbit*.63,r:(state.width<600?5:7)*state.reveal};
      return {sun:sun,planets:planets,project:project,earthMoon:earthMoon,moonOrbit:moonOrbit};
    };
    this.draw=function(state,holes){
      var geometry=this.geometry(state),sun=geometry.sun,reveal=state.reveal*(state.visibility===undefined?1:state.visibility);
      var style=getComputedStyle(canvas),ink=style.getPropertyValue('--color-primary').trim();
      var muted=style.getPropertyValue('--color-text-muted').trim(),background=style.getPropertyValue('--color-bg').trim();
      var gold=style.getPropertyValue('--color-warn').trim();
      function lightAt(x,y){var dx=sun.x-x,dy=sun.y-y,length=Math.hypot(dx,dy)||1;return {x:dx/length,y:dy/length};}
      var viewWidth=state.skyWidth||state.width,offset=(viewWidth-state.width)/2;
      size(space,sky,viewWidth,state.height);space.translate(offset,0);
      if(reveal>0){
        for(var star=0;star<40;star++){
          var span=viewWidth+48;
          var sx=((star*137.21-state.phase*viewWidth*.18)%span+span)%span-offset-24;
          var sy=((star*79.73-state.phase*30)%state.height+state.height)%state.height;
          space.globalAlpha=reveal*.12;space.fillStyle=ink;space.fillRect(sx,sy,1,1);
        }
        [0.38,.72,1,1.45,2.1,2.85,3.6,4.3].forEach(function(orbit){
          space.strokeStyle=ink;space.lineWidth=orbit===1?1:.65;space.globalAlpha=reveal*(orbit===1?.4:.12);
          space.setLineDash(orbit===1?[3,7]:[]);space.beginPath();
          for(var i=0;i<=128;i++){var p=geometry.project(orbit,i/128*TAU);if(i)space.lineTo(p.x,p.y);else space.moveTo(p.x,p.y);}
          space.stroke();
        });space.setLineDash([]);
        geometry.planets.forEach(function(body){
          // Leave bodies outside the view; they enter naturally as the camera moves.
          var reach=body.moons.reduce(function(r,moon){return Math.max(r,moon.d+moon.r);},body.r*(body.rings?2:1))+12;
          if(body.x<-offset-reach||body.x>state.width+offset+reach||body.y<-reach||body.y>state.height+reach)return;
          if(body.moons.length){
            var outer=body.moons[body.moons.length-1].d;
            space.strokeStyle=ink;space.globalAlpha=reveal*.13;space.lineWidth=.65;
            space.beginPath();space.ellipse(body.x,body.y,outer,outer*.5,0,0,TAU);space.stroke();
            body.moons.forEach(function(moon){sphere(space,moon.x,moon.y,moon.r,state.rotation,ink,background,reveal*.75,lightAt(moon.x,moon.y));});
          }
          if(body.rings){
            space.globalAlpha=reveal*.5;space.strokeStyle=ink;space.lineWidth=.7;
            space.beginPath();space.ellipse(body.x,body.y,body.r*1.9,body.r*.55,-.35,0,TAU);space.stroke();
          }
          sphere(space,body.x,body.y,body.r,state.rotation,ink,background,reveal*.78,lightAt(body.x,body.y));
          space.globalAlpha=reveal*.55;space.fillStyle=muted;space.font='9px ui-monospace, monospace';
          var label={x:body.x+body.r+8,y:body.y-7,width:space.measureText(body.name).width,height:12};
          var blocked=holes.some(function(box){return label.x<box.x+box.width+4&&label.x+label.width>box.x-4&&label.y<box.y+box.height&&label.y+label.height>box.y;});
          if(!blocked&&label.x>-offset+8&&label.x+label.width<state.width+offset-8&&label.y>4&&label.y+label.height<state.height-4)space.fillText(body.name,label.x,body.y+3);
        });
        space.strokeStyle=ink;space.lineWidth=.65;space.globalAlpha=reveal*.22;space.setLineDash([1,5]);
        space.beginPath();space.ellipse(state.x,state.y,geometry.moonOrbit,geometry.moonOrbit*.63,0,0,TAU);space.stroke();space.setLineDash([]);
        sphere(space,geometry.earthMoon.x,geometry.earthMoon.y,geometry.earthMoon.r,state.rotation,ink,background,reveal*.8,lightAt(geometry.earthMoon.x,geometry.earthMoon.y));
        space.globalAlpha=reveal*.8;space.strokeStyle=gold;space.lineWidth=1;
        space.beginPath();space.arc(sun.x,sun.y,sun.r,0,TAU);space.stroke();
        space.globalAlpha=reveal*.22;space.beginPath();space.arc(sun.x,sun.y,sun.r+5,0,TAU);space.stroke();
        space.globalAlpha=reveal*.5;
        for(var ray=0;ray<8;ray++){
          var a=ray/8*TAU;
          space.beginPath();space.moveTo(sun.x+Math.cos(a)*(sun.r+9),sun.y+Math.sin(a)*(sun.r+9));
          space.lineTo(sun.x+Math.cos(a)*(sun.r+12),sun.y+Math.sin(a)*(sun.r+12));space.stroke();
        }
        space.font='9px ui-monospace, monospace';space.fillStyle=muted;space.textAlign='center';
        space.fillText('Sun',sun.x,sun.y+sun.r+24);space.textAlign='start';
        // Preserve uninterrupted reading and keep the foreground globe clean.
        space.globalAlpha=1;space.globalCompositeOperation='destination-out';
        holes.forEach(function(box){space.fillRect(box.x-3,box.y-1,box.width+6,box.height+2);});
        space.beginPath();space.arc(state.x,state.y,state.radius-8,0,TAU);space.fill();
        space.globalCompositeOperation='source-over';
      }
      space.globalAlpha=1;
      var side=state.radius*2,r=state.radius-10;
      var light=lightAt(state.x,state.y);
      size(ctx,canvas,side,side);sphere(ctx,state.radius,state.radius,r,state.rotation,ink,background,.58,light);
      ctx.strokeStyle=illumination(ctx,state.radius,state.radius,r,ink,light);ctx.lineWidth=1.1;ctx.globalAlpha=.95;
      var co=Math.cos(state.rotation),si=Math.sin(state.rotation);
      COASTS.forEach(function(line){
        ctx.beginPath();var active=false;
        line.forEach(function(p){
          var z=p[2]*co-p[0]*si;
          if(z<=0){active=false;return;}
          var x=state.radius+r*(p[0]*co+p[2]*si),y=state.radius+r*p[1];
          if(active)ctx.lineTo(x,y);else ctx.moveTo(x,y);active=true;
        });ctx.stroke();
      });ctx.globalAlpha=1;
    };
  };
})();
