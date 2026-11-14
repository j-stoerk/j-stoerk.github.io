/* A tiny composited light field covers the viewport; no page-wide filters. */
(function () {
  'use strict';
  window.PortfolioPageLight=function(){
    var canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    canvas.className='solar-page-light';canvas.setAttribute('aria-hidden','true');
    document.body.appendChild(canvas);
    var source=null,strength=0,frame=0;
    function paint(){
      frame=0;
      var w=window.innerWidth,h=window.innerHeight,scale=144/Math.max(w,h);
      var cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
      if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
      context.clearRect(0,0,cw,ch);
      if(!source||!strength)return;
      var dark=document.documentElement.dataset.theme==='dark';
      var x=(source.x-window.scrollX)*cw/w,y=(source.y-window.scrollY)*ch/h;
      var radius=Math.hypot(cw,ch)*.7;
      context.globalCompositeOperation='source-over';
      context.fillStyle='rgba(9,20,37,'+((dark?.30:.23)*strength)+')';
      context.fillRect(0,0,cw,ch);
      // Remove shadow near the Sun, then add a restrained pool of light.
      var opening=context.createRadialGradient(x,y,0,x,y,radius);
      opening.addColorStop(0,'rgba(0,0,0,1)');opening.addColorStop(.2,'rgba(0,0,0,.94)');
      opening.addColorStop(.65,'rgba(0,0,0,.3)');opening.addColorStop(1,'rgba(0,0,0,0)');
      context.globalCompositeOperation='destination-out';context.fillStyle=opening;context.fillRect(0,0,cw,ch);
      var glow=context.createRadialGradient(x,y,0,x,y,radius*.8);
      glow.addColorStop(0,dark?'rgba(231,240,255,'+(.16*strength)+')':'rgba(255,248,224,'+(.07*strength)+')');
      glow.addColorStop(1,'rgba(255,248,224,0)');
      context.globalCompositeOperation='source-over';context.fillStyle=glow;context.fillRect(0,0,cw,ch);
    }
    this.update=function(sun,intensity){cancelAnimationFrame(frame);frame=0;source=sun;strength=intensity;paint();};
    this.show=function(){canvas.style.transition='none';canvas.style.opacity='1';};
    this.fade=function(){canvas.style.transition='opacity 1s ease';canvas.style.opacity='0';};
    this.clear=function(){
      cancelAnimationFrame(frame);frame=0;strength=0;source=null;
      canvas.style.transition='none';canvas.style.opacity='0';context.clearRect(0,0,canvas.width,canvas.height);
    };
    function followViewport(){if(!strength||frame)return;frame=requestAnimationFrame(paint);}
    window.addEventListener('scroll',followViewport,{passive:true});
    window.addEventListener('resize',followViewport,{passive:true});
  };
})();
