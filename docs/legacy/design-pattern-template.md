---

thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: 模板设计模式
tags: [design-pattern]
date: 2019-11-06
---

可能说 base 层封装更好理解一些。



<!-- more -->

#### 定义

模板模式的官方解释是，**定义一个操作中的算法的骨架，而将一些步骤延迟到子类中。模板方法使得子类可以不改变一个算法的结构即可重定义该算法的某些特定步骤。**

这么说可能比较抽象，其实简单来说，就是我们平时开发过程中常常会用到的基类封装。

```java
public abstract class BaseActivity extends AppCompatActivity {
  	
  	@Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(getLayoutId());
      	initView();
    }
  
  	public abstract int getLayoutId();
  	public abstract void initView();
}
```

就像上边的代码，**定义一个基本框架**，使用抽象父类和抽象方法，**将一些步骤延迟到子类中**，子类可以通过继承基类，从而**在不改变原本框架结构**的基础上**自定义**特定步骤。

打个比方，

你上学的时候不是很乖，老师经常罚你写检查，于是你灵机一动，在某个风和日丽的午后，写出来十份检查。每份检查的大体内容都是差不多的，只有具体反思错误的部分是留白的，因为你也不知道下一个让你写检查的老师是谁，也不知道是为了什么写检查。天资聪颖的你啊，年纪轻轻就掌握了封装的精髓，长大后成为了一名程序员（误）。



#### 系统源码对模板模式的应用

模板模式作为一个较常用且简单的模式，在日常开发中有比较广泛的应用。这里简单以 Android View 的绘制流程为例，说明一下源码级别的应用实例。

- View#onDraw()

  View 的绘制流程确实是老生常谈了，[具体流程](https://www.jianshu.com/p/d7ab114ac1f7)我们这里不多讲，只解释一下模板设计模式的具体应用。

  我们在自定义 View 的时候一般会重写一个 onDraw() 方法，当我们去查看父类 View.java 时会发现，其中的 onDraw() 方法是空实现的，没有任何内容；但是当我们在自己重写的方法中，通过画笔进行一系列自定义操作后，我们想要的效果就会实现。

- Activity 生命周期

  我们在平时用的太多，以至于忽略了 Activity 生命周期也是应用了模板设计模式。

  所有自己定义的 Activity 都继承自 Activity ，并且所有的 Activity 的生命周期流程都是一致的，每个 Activity 可以设置不同的页面，实现不同的逻辑。

- AsyncTask

  Android 自带的 AsyncTask 也是对模板模式的应用。

  ```java
  new AsyncTask<Void, Integer, String>(){
      @Override
      protected void onProgressUpdate(Integer... values) {
        
      }
  
      @Override
      protected String doInBackground(Void... voids) {
        return null;
      }
  
      @Override
      protected void onPostExecute(String s) {
        
      }
  };
  ```

  框架内定的实现逻辑我们是不能更改，甚至不能看到的；但是我们可以通过暴露出来的方法，来实现完全不同的逻辑和业务。





