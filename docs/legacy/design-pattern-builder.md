---

thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: Builder 设计模式
tags: [design-pattern]
date: 2019-10-26
---

哎呀，你说的这个我知道，Builder 设计模式不就是链式调用嘛！

<!-- more -->

其实 Builder 设计模式还是比较常用的一个设计模式，我们平时的开发中偶尔也经常用到。

Builder 设计模式，又称为建造者设计模式，主要的目标是将参数构建过程和对象表现过程进行分离，让参数的构建过程更加直观和易用。

具体是示例有 OkHttp，系统的 AlertDialog 都是 Builder 设计模式。Builder 设计模式最直观的表现是，在创建某个对象时不是直接 new 该类的对象，而是通过该类的静态内部类 Builder 来构建，并通过最终的 build 方法来完成对象的实例化。

来一个简单的调用例子：

```java
PosAlertDialog backAlertDialog = new PosAlertDialog.Builder(mContext)
                    .setRemindText("确定要中断盘点吗？")
                    .setPrimaryText("继续盘点")
                    .setSecondaryText("中断盘点")
                    .setUseLoadingButton(false)
                    .setOnCancelClickListener(new PosAlertDialog.OnCancelClickListener() {
                        @Override
                        public void onCancelClick(View view, Dialog dialog) {
                            
                        }
                    })
                    .build();
backAlertDialog.show();
```

我们可以看到，通过 Builder 的方法，对弹窗的具体属性、点击事件等进行声明，并在最终通过 build 方法真正创建并返回 PosAlertDialog 的实例，较为流畅地完成整个弹窗的初始化及展示逻辑。



### Builder 设计模式 VS 链式调用

那回到最初的问题，Builder 设计模式就是链式调用吗？毕竟在我们的例子中也是使用了链式调用。答案是否定的。Builder 设计模式是一种设计模式，目的在于整合多参数的声明，拆分参数声明和对象创建的过程，使得整个过程更加直观、易用；而链式调用只不过是一种调用方式，只要开发者喜欢，基本上任何方法都可以使用链式调用的方式。比如下面这个例子：

```java
public class AppVersionEntity {
  private String version;
  private String smVersion;
  private String updateInfo;

  public void setUpdateInfo(String updateInfo) {
    this.updateInfo = updateInfo;
    return this;
  }

  public void setVersion(String version) {
    this.version = version;
    return this;
  }

  public void setSmVersion(String smVersion) {
    this.smVersion = smVersion;
    return this;
  }
}

AppVersionEntity entity = new AppVersionEntity()
   		.setUpdateInfo("1")
   		.setVersion("1")
   		.setSmVersion("1");
```

我们可以看到，这只是一个非常普通的 Java bean，但是我们却可以使用链式调用的方式，一次性为属性批量赋值，但是这很明显不是 Builder 设计模式。

