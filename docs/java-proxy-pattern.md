---

thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: Java 代理模式简单探讨
tags: [design-pattern]
date: 2019-08-14

---



动态代理是 Hook 技术的基础技能，下一篇暂定 activity 的启动流程，这篇先来搞一下这个代理设计模式吧。

<!-- more -->

### 定义

先上定义。

> 代理模式的定义：为其他对象提供一种代理以控制对这个对象的访问。在某些情况下，一个对象不适合或者不能直接引用另一个对象，而代理对象可以在客户端和目标对象之间起到中介的作用。

说实话我也看不太懂，但是说到代理，基本上往中介方向理解就差不多。

房产中介，就是为租客提供一种服务，以帮助租客租到心仪的房子。一个租客不可能直接接触到租房市场上所有的房源，而中介可以在租客和房子中间起到协调的作用。

哈哈，我可真他娘的是个人才，反正大概就这么个意思吧！



#### 静态代理

下边正经点儿，代理模式就是客户端不直接操作对象，而是由一个中间者（即代理），来对目标对象进行操作，从而间接地操纵或者增强目标对象。UML 类图我还没学会，直接上代码吧！

```java

public interface IRentHouse{
  void rentHouse();
}

public class Couple implements IRentHouse{
  
  public void rentHouse(){
    System.out.println("新婚快乐！但是押一付三再加服务费好多钱，自如黑中介！");
  }
  
}

public class RentAgent implements IRentHouse{

  private IRentHouse mClient;
  
  public RentAgent(IRentHouse client){
    mClient = client;
  }
  
  public void rentHouse(){
    System.out.println("联系房东，商谈价格");
    if(mClient != null){
      	mClient.rentHouse();
    }
    System.out.println("双周保洁，家电保修");
  }

}

```

如上，客户不需要关心租房前后一系列繁琐的事，把这一切都委托给代理去做，自己只管付钱。在这个事例中，`RentAgent` 即为 `Couple` 的代理类，帮助 `Couple` 处理租房事宜，客户端即通过 `RentAgent` 间接操纵了 `Couple` 的动作。

具体调用以及输入结果：

```java
public static void main(String[] args) {

  Couple couple = new Couple();
  RentAgent rentAgent = new RentAgent(couple);
  rentAgent.rentHouse();

}
```

```java
联系房东，商谈价格
新婚快乐！但是押一付三再加服务费好多钱，自如黑中介！
双周保洁，家电保修
```

以上就是静态代理。

这种模式很简单，也很清晰，但是缺点也很明显，即代理类和主体类都需要实现接口，而且接口方法一旦发生变动，同时这一动作并非双方都需要的（比如说需要为房产中介提供一个和房东协商价格的方法，这个动作本身和租客并没有关系），那么代码可维护性会变得非常差。



#### 动态代理

在这种情况下，我们就需要了解一下动态代理。动态代理又称为 JDK 代理或者接口代理，其主要是利用 JDK API，从内存层面在运行时为目标接口动态地创建对象，从而实现对目标对象的代理功能，而不受接口方法变动的影响。

虽然思路大致相同，但是动态代理与静态代理在实现上有本质的区别。静态代理需要显式地写出代理类，委托类，接口等，开发者需要在编译期就手动编码实现代理模式；而动态代理省略了创建代理类的过程，把这个工作交给 JDK 在运行时处理。很明显，这样的设计使得 **JDK 代理要求目标对象必须实现接口，否则无法使用动态代理**。

废话不多说，还是直接看代码。

动态代理的实现主要依靠几个类:

- java.lang.reflect.Proxy

  ```java
  // Proxy 类静态方法，返回一个指定接口的代理类实例
  // 方法传入 InvocationHandler 对象，代理类会拦截所有的执行方法，并通过该处理器自行处理
  Object newProxyInstance(ClassLoader loader,		 // 指定当前目标对象使用类加载器
                          Class<?>[] interfaces, // 目标对象实现的接口的类型
                          InvocationHandler h		 // 自定义方法处理器
                          ){}
  ```

- java.lang.reflect.InvocationHandler

  ```java
  // 代理类会拦截所有的方法，并经由此方法重新调用
  // 代理类即可以在此进行自己的处理
  Object invoke(Object proxy, Method method, Object[] args){}
  ```

下面我们使用动态代理机制，来实现一下我们之前的租房案例。

```java
class RentInvocationHandler implements InvocationHandler {

    private Object mClient;

    public RentInvocationHandler(Object client) {
        this.mClient = client;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {

        System.out.println("联系房东，商谈价格");
        Object invoke = method.invoke(mClient, args);
        System.out.println("双周保洁，家电保修");

        return invoke;
    }
}
```

具体调用：

```java
Couple couple = new Couple();
// 使用动态代理，办理租房业务
IRentHouse rentProxy =(IRentHouse)Proxy.newProxyInstance(
  														couple.getClass().getClassLoader(),
               								couple.getClass().getInterfaces(), 
  														new RentInvocationHandler(couple));
rentProxy.rentHouse(); // 代理执行方法
```

输入结果：

```java
联系房东，商谈价格
新婚快乐！但是押一付三再加服务费好多钱，自如黑中介！
双周保洁，家电保修
```

具体使用并不复杂，就不再多说，但是关于动态代理生成的代理类本身也有一些特点，下面大概罗列一下：

1. 类修饰符

   该代理类具有 final 和 public 修饰符，意味着它可以被所有的类访问，但是不能被再度继承

2. 类名

   格式是 “$ProxyN”，其中 N 是一个逐一递增的阿拉伯数字，代表 Proxy 类第 N 次生成的动态代理类，值得注意的一点是，并不是每次调用 Proxy 的静态方法创建动态代理类都会使得 N 值增加，原因是 Proxy 内部对动态代理类做了缓存，如果以前生成过相应的对象，则会直接返回该对象而不是重新创建

3. 继承关系

   $Proxy0 extends Proxy implements InterfaceA, InterfaceB, InterfaceX

动态代理避免了静态代理代码维护的缺点，动态生成代理类，较为灵活，但是缺点也比较明显：因为 Java 的单继承特性（每个代理类都继承了 Proxy 类），只能针对接口创建代理类，不能针对类创建代理类。



### Cglib 代理

这个东西就很厉害了。前文说了，动态代理的缺点是要求目标对象必须实现接口，否则就无法实现动态代理。Cglib 就是为了解决这个问题出现的，使用cglib代理的对象则无需实现接口，达到代理类无侵入。

Cglib 在 Android 使用的不多，后端的同学可能更熟悉一些，Spring 框架就集成了这个库。

使用cglib需要引入[cglib的jar包](https://repo1.maven.org/maven2/cglib/cglib/3.2.5/cglib-3.2.5.jar)，具体使用如下：

```java
public class ProxyFactory implements MethodInterceptor{

    private Object target;	//维护一个目标对象
    public ProxyFactory(Object target) {
        this.target = target;
    }
    
    //为目标对象生成代理对象
    public Object getProxyInstance() {
        //工具类
        Enhancer en = new Enhancer();
        //设置父类
        en.setSuperclass(target.getClass());
        //设置回调函数
        en.setCallback(this);
        //创建子类对象代理
        return en.create();
    }

    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
        System.out.println("开启事务");
        // 执行目标对象的方法
        Object returnValue = method.invoke(target, args);
        System.out.println("关闭事务");
        return returnValue;
    }
}
```

具体和动态代理大体相同，就不再赘述了。



### 代理模式 vs 装饰模式

熟悉装饰者模式的同学可能会有点儿头疼，因为代理模式感觉和装饰者模式一毛一样……反正都是定义个接口，包裹一下委托类，然后操作一下代理类，实际操作了委托类嘛！

二者确实比较相似，从 UML 类图看都没有任何区别，代理类/装饰类与委托类都继承自同一个接口或者抽象类，然后代理类/装饰类包装委托类。

- 装饰模式：能动态的新增或组合对象的行为

  在不改变接口的前提下，动态扩展对象的功能

- 代理模式：为其他对象提供一种代理以控制对这个对象的访问

  在不改变接口的前提下，控制对象的访问

装饰模式是“新增行为”，而代理模式是“控制访问”。关键就是我们如何判断是“新增行为”还是“控制访问”。

具体举例来说，

1. 网上很多封装了带上拉刷新下拉加载的 RecyclerView，实现方式就是装饰模式，一般都是定义一个 Wrapper 来包裹原 adapter 以及原 RecyclerView，在此基础上新增了「下拉刷新」、「上拉加载」的行为；

2. Retrofit 的 create 方法就是动态代理的应用，不对接口做出任何新增行为，只是通过动态代理创建接口对象，控制对接口的访问；

   ```java
   public <T> T create(final Class<T> service) {
       return (T) Proxy.newProxyInstance(
         						service.getClassLoader(), 
         						new Class<?>[] { service }, 
         						new InvocationHandler() {}});
   }
   ```



### 参考文献

- [代理模式及Java实现动态代理](https://www.jianshu.com/p/6f6bb2f0ece9)

- [Java 动态代理机制分析及扩展](https://www.ibm.com/developerworks/cn/java/j-lo-proxy1/)

- [Java代理(jdk静态代理、动态代理和cglib动态代理)](https://www.cnblogs.com/fillPv/p/5939277.html)

- [Java三种代理模式：静态代理、动态代理和cglib代理](https://segmentfault.com/a/1190000011291179)

- [Java的三种代理模式](https://segmentfault.com/a/1190000009235245)

  

