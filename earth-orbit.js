/* Schematic heliocentric scene viewed from near the draggable Earth. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var BODIES = [
    {name:'Mercury',orbit:.38,phase:1.1,speed:2.2,r:3},
    {name:'Venus',orbit:.72,phase:3.8,speed:1.35,r:5},
    {name:'Mars',orbit:1.45,phase:-.5,speed:.7,r:4},
    {name:'Jupiter',orbit:2.1,phase:2.2,speed:.34,r:11},
    {name:'Saturn',orbit:2.85,phase:4.4,speed:.22,r:9,rings:true},
    {name:'Uranus',orbit:3.6,phase:1.5,speed:.14,r:6},
    {name:'Neptune',orbit:4.3,phase:5.8,speed:.1,r:6}
  ];
  function size(context, element, w, h) {
    var dpr=Math.min(devicePixelRatio||1,2),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
    if(element.width!==pw||element.height!==ph){element.width=pw;element.height=ph;}
    context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);
  }
  function sphere(context,x,y,r,rotation,ink,background,opacity) {
    context.save();context.translate(x,y);
    context.beginPath();context.arc(0,0,r,0,TAU);context.fillStyle=background;context.globalAlpha=.94;context.fill();
    context.strokeStyle=ink;context.lineWidth=.75;context.globalAlpha=opacity*.45;
    function project(lat,lon){var a=lon+rotation,c=Math.cos(lat);return [r*c*Math.sin(a),r*Math.sin(lat),c*Math.cos(a)];}
    function trace(points){
      context.beginPath();var active=false;
      points.forEach(function(p){if(p[2]<0){active=false;return;}if(active)context.lineTo(p[0],p[1]);else context.moveTo(p[0],p[1]);active=true;});context.stroke();
    }
    if(r>7){
      for(var lat=-1.05;lat<=1.06;lat+=.35){
        var parallel=[];for(var lon=-Math.PI;lon<=Math.PI+.04;lon+=.06)parallel.push(project(lat,lon));trace(parallel);
      }
      for(var m=0;m<TAU;m+=Math.PI/5){
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
      var angle=2.3+state.phase,yaw=state.phase*.22;
      var scale=Math.max(165,Math.min(460,state.width*.5))*(1-.12*state.reveal);
      scale*=Math.max(.36,1/(1+Math.max(0,(state.travel||0)-120)/600));
      var ex=Math.cos(angle),ey=Math.sin(angle),co=Math.cos(yaw),si=Math.sin(yaw);
      function project(orbit,phase){
        var dx=orbit*Math.cos(phase)-ex,dy=orbit*Math.sin(phase)-ey;
        var horizontal=dx*co+dy*si,depth=dy*co-dx*si;
        var perspective=4.8/(4.8+depth*.18);
        return {x:state.x+horizontal*scale*perspective,y:state.y-depth*scale*.48*perspective,depth:depth};
      }
      var sun=project(0,0);sun.r=(state.width<600?17:23)*state.reveal;
      var planets=BODIES.map(function(body){
        var p=project(body.orbit,body.phase+state.phase*body.speed);
        return {name:body.name,x:p.x,y:p.y,r:body.r,orbit:body.orbit,rings:body.rings};
      });
      return {sun:sun,planets:planets,project:project};
    };
    this.draw=function(state,holes){
      var geometry=this.geometry(state),sun=geometry.sun,reveal=state.reveal;
      var style=getComputedStyle(canvas),ink=style.getPropertyValue('--color-primary').trim();
      var muted=style.getPropertyValue('--color-text-muted').trim(),background=style.getPropertyValue('--color-bg').trim();
      var gold=style.getPropertyValue('--color-warn').trim();
      var viewWidth=state.skyWidth||state.width,offset=(viewWidth-state.width)/2;
      size(space,sky,viewWidth,state.height);space.translate(offset,0);
      if(reveal>0){
        for(var star=0;star<40;star++){
          var span=viewWidth+48;
          var sx=((star*137.21-state.phase*viewWidth*.12)%span+span)%span-offset-24;
          var sy=((star*79.73-state.phase*23)%state.height+state.height)%state.height;
          space.globalAlpha=reveal*.12;space.fillStyle=ink;space.fillRect(sx,sy,1,1);
        }
        [0.38,.72,1,1.45,2.1,2.85,3.6,4.3].forEach(function(orbit){
          space.strokeStyle=ink;space.lineWidth=orbit===1?1:.65;space.globalAlpha=reveal*(orbit===1?.3:.12);
          space.setLineDash(orbit===1?[3,7]:[]);space.beginPath();
          for(var i=0;i<=128;i++){var p=geometry.project(orbit,i/128*TAU);if(i)space.lineTo(p.x,p.y);else space.moveTo(p.x,p.y);}
          space.stroke();
        });space.setLineDash([]);
        geometry.planets.forEach(function(body){
          // Leave bodies outside the view; they enter naturally as the camera moves.
          if(body.x<-offset-40||body.x>state.width+offset+40||body.y<-40||body.y>state.height+40)return;
          if(body.rings){
            space.globalAlpha=reveal*.5;space.strokeStyle=ink;space.lineWidth=.7;
            space.beginPath();space.ellipse(body.x,body.y,body.r*1.9,body.r*.55,-.35,0,TAU);space.stroke();
          }
          sphere(space,body.x,body.y,body.r,state.rotation,ink,background,reveal*.6);
          space.globalAlpha=reveal*.55;space.fillStyle=muted;space.font='9px ui-monospace, monospace';
          var label={x:body.x+body.r+8,y:body.y-7,width:space.measureText(body.name).width,height:12};
          var blocked=holes.some(function(box){return label.x<box.x+box.width+4&&label.x+label.width>box.x-4&&label.y<box.y+box.height&&label.y+label.height>box.y;});
          if(!blocked&&label.x>-offset+8&&label.x+label.width<state.width+offset-8&&label.y>4&&label.y+label.height<state.height-4)space.fillText(body.name,label.x,body.y+3);
        });
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
      size(ctx,canvas,side,side);sphere(ctx,state.radius,state.radius,r,state.rotation,ink,background,.7);
      // A few observation points keep the original globe's restrained schematic character.
      for(var node=0;node<26;node++){
        var lat=Math.asin(1-2*(node+.5)/26),lon=node*2.39996+state.rotation,c=Math.cos(lat),z=c*Math.cos(lon);
        if(z<0)continue;
        ctx.globalAlpha=.25+.4*z;ctx.fillStyle=node%7?ink:gold;
        ctx.beginPath();ctx.arc(state.radius+r*c*Math.sin(lon),state.radius+r*Math.sin(lat),node%7?1.1:1.8,0,TAU);ctx.fill();
      }ctx.globalAlpha=1;
    };
  };
})();
