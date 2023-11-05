---

thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: 单例设计模式
tags: [design-pattern]
date: 2019-10-26
---



茴香的「茴」字有几种写法？



<!-- more -->

单例模式有很多种写法，都不复杂，大概梳理一下。

#### 饿汉式

私有化构造器，提供共有方法获取实例对象，没什么多说的。静态对象和类一起加载，耗费资源，不推荐。

```java
class Singleton {

    public static Singleton sInstance = new Singleton();

    private Singleton() {}

    public static Singleton getInstance() {
        return sInstance;
    }

}
```



#### 懒汉式

最简单的懒汉单例，但是会有线程安全的问题，需要完善。

```java
class Singleton {

    public static Singleton sInstance;

    private Singleton() {}

    public static Singleton getInstance() {
      	if(sInstance == null){
           sInstance = new Singleton();
        }
        return sInstance;
    }

}
```



#### 双重校验锁懒汉单例

有几个需要注意的地方：

1. 单例对象加上 `volatile` 关键字，防止重排序，保证多线程可见性

2. 两个判空都不能省略，第一个 if 用来提升效率，有对象后不再创建；第二个 if 用来保证线程安全。

   > 如果没有第二个 if，虽然被 synchronized 锁在了外面，但是等第一个线程创建完对象，第二个线程还是可以继续往下执行
   
3. synchronized 的锁不可以为 new Object(), 锁必须保证唯一性

```java
class Singleton {
    public static volatile Singleton sInstance;
    private Singleton() {}
    public static Singleton getInstance() {
      if(sInstance == null){
        synchronized (Singleton.class) {
          if(sInstance == null){
            sInstance = new Singleton();
          }
        }
      }
      return sInstance;
    }
}
```



#### 静态内部类

静态内部类也是个比较推崇的方式了，当一个 Java 类第一次被真正使用到的时候才会去加载静态资源。Java 类加载和初始化的过程都是线程安全的。

```java
class Singleton {
    private Singleton() {}
    public Singleton getInstance() {
        return Holder.mInstance;
    }
    private static class Holder {
        private static Singleton sInstance = new Singleton();
    }
}
```



#### 枚举

枚举单例即为简洁，且无偿提供序列化机制，绝对防止多次实例化，即便用反射都不行。单元素的枚举类型是目前实现 Singleton 的最佳方法。

```java
enum Singleton{
  INSTANCE
}
```

