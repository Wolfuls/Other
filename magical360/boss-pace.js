/* Scale only active boss actions/physics. Projectiles, candy and cutscenes keep their clocks. */
(function(){const P=Miload.Game.prototype;
for(const [name,rate]of [['stepBoss',.8],['stepNaniwa',.9],['stepFarmEnemy',.9],['stepLibraryBoss',.95]]){const old=P[name];P[name]=function(e,dt){return old.call(this,e,dt*(name==='stepFarmEnemy'&&e.species!=='keeper'?1:rate));};}
})();
