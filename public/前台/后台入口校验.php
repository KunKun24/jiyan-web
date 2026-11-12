<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>进入后台</title></head><body><script>
(function(){
  const u=localStorage.getItem("Username"), p=localStorage.getItem("Password"), t=localStorage.getItem("token");
  if(!u||!p||!t){location.replace("/前台/开发者登录.php");return;}
  location.replace("/前台/用户后台.php");
})();
</script></body></html>
