---

thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: 工厂设计模式
tags: [design-pattern]
date: 2019-10-29
---



为什么你们一讲工厂设计模式，就非要弄个工厂生产小汽车？？？



<!-- more -->


#### 模式定义

定义一个创建对象的公共接口（意味着不同类之间会有共性），让子类决定实例化哪个类，而对象的创建统一交由工厂完成，有良好的封装性，既做到了解耦，也保证了最少知识原则。调用者不会了解到具体子类的实现，但是能通过工厂方法做到想做的事情。

工厂模式主要有几种实现方式，分别为简单工厂、工厂方法和抽象工厂。看过太多博客，都是弄个 Factory 就开始生产汽车，我是真的不想生产汽车啊。。

我们这里以数据存储为例，我们可以根据项目需求动态的选择是通过 SharedPreferences 的方式存储到本地，还是利用 LruCache 将数据缓存到内存中，而具体的实现方式就是工厂设计模式的应用。废话不多说，开始吧。



#### 简单工厂

顾名思义，简单工厂就是较为简单的工厂模式。

```java
enum IOHandlerFactory {
    INSTANCE;
    enum IOType{
        MEMORY, SP
    }

    public IOHandler createIOHandler(IOType type) {
        switch (type) {
            case MEMORY:
                return new MemoryIOHandler();
            case SP:
                return new SPIOHandler();
        }
        return null;
    }
}

IOHandlerFactory.INSTANCE.createIOHandler(IOType.SP);
```

基本就是提供一个方法，方法面向接口，根据不同的 IOType 返回不同的 IOHandler 接口实例对象，但是这种方法的问题在于，一旦有新增加的 IOType，那就要变动很多地方，可维护性不强。



#### 工厂方法

这种模式在于为每一种 type 都提供一个工厂方法，直接返回目标对象。

```java
public interface IOFactory {
    IOHandler createIOHandler();
}

public class MemoryIOFactoty implements IOFactory {
    @Override
    public IOHandler createIOHandler() {
        return new MemoryIOHandler();
    }
}

public class SPIOFactoty implements IOFactory {
    @Override
    public IOHandler createIOHandler() {
        return new SpIOHandler(null);
    }
}

new MemoryIOFactoty().createIOHandler();
```

这种方式的优点在于清晰明了，通过工厂接口去创建目标对象，但是缺点在于涉及到的类太多，而且逻辑基本相同，代码冗余严重。



#### 抽象工厂

定义和 BitmapFactory 比较像，和简单工厂也比较像，但是通过泛型和反射机制简化代码。

```java
enum IOHandlerFactory {

    INSTANCE;

    public IOHandler createIOHandler(Class<? extends IOHandler> ioHandlerClass) {
        try {
            return ioHandlerClass.newInstance();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public IOHandler getMemoryIOHandler() {
        return createIOHandler(MemoryIOHandler.class);
    }

    public IOHandler getSPIOHandler() {
        return createIOHandler(SpIOHandler.class);
    }

    public IOHandler getDefaultIOHandler() {
        return getSPIOHandler();
    }

}

IOHandlerFactory.INSTANCE.getDefaultIOHandler();
```

这种方式和简单工厂差不多，代码简单，没有太多的类，也利用反射机制避免了每次新增类型时频繁变更代码，是比较推崇的方式。



