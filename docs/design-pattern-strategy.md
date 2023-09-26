---

thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: 策略设计模式
tags: [design-pattern]
date: 2019-11-08
---



上班坐公交还是坐地铁？这就是两种不同的策略。



<!-- more -->

#### 定义

面向同一接口实现一系列算法，然后将他们分别封装起来，再经由同一入口进行调用；不同的策略之间可以相互替换。主要用来解决同一任务，多种条分支的情况下，过多 if-else 分支的情况。

比如属性动画的差值器设置：

```java
ObjectAnimator.ofFloat().setInterpolator(TimeInterpolator value);
```

我们看到，参数需要的是 TimeInterpolator 对象，我们点进去会发现：

```java
public interface TimeInterpolator {
    float getInterpolation(float input);
}
```

而我们平时常用的几个差值器也就都实现了这个接口：

- AccelerateInterpolator
- DecelerateInterpolator
- AnticipateInterpolator
- CycleInterpolator
- LinearInterpolator
- ... ...

不同的差值器只是 `getInterpolation()` 的实现不同，所以**面向接口将不同的算法进行封装，再经由同一入口进行调用；不同的策略之间可以相互替换。**



#### 具体实践案例

下面我们以货币基金收益为例，简单的实践一下策略设计模式。

我们的目标是对于给定的时间和本金，得到不同平台对应的利息。

下面是通用接口：

```java
public interface IFinanceInterest{
  double getInterest(int month, int money);
}
```

余额宝：

```java
public class AlipayFinance implements IFinanceInterest{
  @Overide
  double getInterest(int month, int money){
  	switch(month){
      case 3:
        return money * (1 + 0.026 / 12 * 3);
      case 6:
        return money * (1 + 0.035 / 12 * 3);
      case 12:
        return money * (1 + 0.043 / 12 * 3);
      default:
        return money * (1 + 0.02 / 12 * 3);
    }
  }
}
```

朝朝盈：

```java
public class ZhaoShangFinance implements IFinanceInterest{
  @Overide
  double getInterest(int month, int money){
  	switch(month){
      case 3:
        return money * (1 + 0.028 / 12 * 3);
      case 6:
        return money * (1 + 0.037 / 12 * 3);
      case 12:
        return money * (1 + 0.052 / 12 * 3);
      default:
        return money * (1 + 0.02 / 12 * 3);
    }
  }
}
```

一般来讲，在策略模式中，我们还需要一个上下文对象，用于不同策略间的转换。

```java
public class FinanceContext{
  
  private IFinanceInterest mFinance;
  public FinanceContext(IFinanceInterest interest){
     mFinance = interest;
  }

  public void setFinanceInterest(IFinanceInterest interest){
    mFinance = interest;
  }
	
  public double getMyInterest(int month, int money){
    mFinance.getInterest(month, money);
  }
  
}
```

具体使用：

```java
public static void main(String[] args) {
      FinanceContext context = new FinanceContext(new AlipayFinance());    
      context.getMyInterest(3, 12000);
 
      context.setFinanceInterest(new ZhaoShangFinance())
      context.getMyInterest(12, 12000);
}
```



#### 模式优缺点

- 优点
  - 