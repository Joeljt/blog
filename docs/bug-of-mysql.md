---
title: 解决可视化工具对于 MySQL 8.0 + 无法连接的问题

date: 2018-05-28
---



MySQL 8.0 版本去除了 password 字段，改用 authentication_string 字段，导致网上可以搜到的各种问题的各种解决方法完全没有效果。

<!-- more -->

同时还更改了加密方式，之前版本的加密方式是「mysql_native_password」，8.0 之后的加密规则更改为「caching_sha2_password 」，这里需要把用户密码加密规则更改为原来的加密方式即可。



具体方法步骤如下，记录备忘：

>  打开终端，输入命令

```mysql
mysql -u root -p
```
> 需要注意的是，MySQL 设置的密码中必须至少包含一个大写字母、一个小写字母、一个特殊符号、一个数字，至少 8 个字符；密码是在最开始安装 MySQL 的时候设置的，如果忘记了，上网查询解决方法。



> 输入密码后，进入 >mysql 的命令行模式

```mysql
# 切换到 mysql 数据库
use mysql;

# 设置用户密码永不过期
alter user 'root'@'localhost' identified by 'your pwd' password expire never;

# 用「mysql_native_password」加密方式更新 root 用户密码
alter user 'root'@'localhost' identified with mysql_native_password by 'your pwd';

# 刷新
flush privileges;
```
