const pm2 = require('pm2');
pm2.connect(function(err) {
  if (err) {
    console.error(err);
    process.exit(2);
  }
  pm2.list((err, list) => {
    if (err) console.error(err);
    else {
      list.forEach(p => console.log(JSON.stringify({name: p.name, cwd: p.pm2_env.pm_cwd})));
    }
    pm2.disconnect();
  });
});
