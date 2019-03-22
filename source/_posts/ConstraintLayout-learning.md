---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321181407.jpg
title: ConstraintLayout 介绍
tags: [Android]
date: 2019-03-22
---

不知道从什么时候开始，Android 死丢丢已经默认使用约束布局 ConstraintLayout 作为默认布局了，但是懒癌发作一直不想学习，每次都换成 LinearLayout，这次也忘记了为啥开始学习这个东西，学完发现还挺爽……写个笔记记录一下，哈哈



<!-- more -->



正文开始~

#### 相对布局

##### 属性集合

类似 RelativeLayout ，使用相对位置的属性来互相约束位置。具体的属性以及使用方式也类似 RelativeLayout，默认像 FrameLayout 一样堆叠在一起，使用属性讲层级关系区分开：

```xml
layout_constraintLeft_toLeftOf   当前控件的左侧与某个控件的左侧对齐
layout_constraintLeft_toRightOf  当前控件的左侧与某个控件的右侧对齐
layout_constraintRight_toLeftOf  当前控件的右侧与某个控件的左侧对齐
layout_constraintRight_toRightOf 当前控件的右侧与某个控件的右侧对齐

layout_constraintStart_toEndOf   同上
layout_constraintStart_toStartOf
layout_constraintEnd_toStartOf
layout_constraintEnd_toEndOf

layout_constraintTop_toTopOf       当前控件与某个控件顶端对齐
layout_constraintTop_toBottomOf    即当前控件某个控件的下面
layout_constraintBottom_toTopOf    即当前控件在某个控件的上面
layout_constraintBottom_toBottomOf 当前控件与某个控件底部对齐

layout_constraintBaseline_toBaselineOf 文本基线对齐
```

##### 具体示例

```xml
<!-- 居中对齐实现方式 -->

<!-- 上下左右全部受 parent 约束，最后的效果就是「居中对齐」 -->
<TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="居中对齐"
    app:layout_constraintTop_toTopOf="parent"
    app:layout_constraintBottom_toBottomOf="parent"
    app:layout_constraintLeft_toLeftOf="parent"
    app:layout_constraintRight_toRightOf="parent"/>

<!-- 同理，左右受 parent 约束，效果就是「水平居中对齐」-->
<TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="水平居中对齐"
    app:layout_constraintLeft_toLeftOf="parent"
    app:layout_constraintRight_toRightOf="parent"/>

<!-- 同理，上下受 parent 约束，效果就是「垂直居中对齐」-->
<TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="垂直居中对齐"
    app:layout_constraintTop_toTopOf="parent"
    app:layout_constraintBottom_toBottomOf="parent"/>
```

居中对齐很好理解，下边我们来写一个正常的 item 布局看看：

![ConstraintLayout 实现的 item 布局](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322142136.png)

```xml
<android.support.constraint.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:padding="5dp">

    <ImageView
        android:id="@+id/iv_logo"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:background="@mipmap/ic_launcher" />

    <!-- 设置标题名称 View 的左侧边缘位于 logo 的右侧 -->
    <TextView
        android:id="@+id/tv_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginLeft="10dp"
        android:text="虾吃虾涮（华贸店）"
        app:layout_constraintLeft_toRightOf="@+id/iv_logo"
        app:layout_constraintTop_toTopOf="parent" />

    <!-- 设置价格 View 的底部靠近父布局，且顶部参考 titleView，同时左侧与 titleView 对齐 -->
    <TextView
        android:id="@+id/tv_price"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="￥64/人"
        android:textSize="13sp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintLeft_toLeftOf="@id/tv_title"
        app:layout_constraintTop_toBottomOf="@id/tv_title" />

    <!-- 设置 distanceView 紧贴屏幕右侧，且顶部与 priceView 对齐-->
    <TextView
        android:id="@+id/tv_distance"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="1.1km"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toTopOf="@id/tv_price" />

    <!-- 设置 areaView 顶部与左侧都参考 priceView，底部位置参考 ivLogo-->
    <TextView
        android:id="@+id/tv_area"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="朝阳区 大望路"
        android:textSize="13sp"
        app:layout_constraintBottom_toBottomOf="@id/iv_logo"
        app:layout_constraintLeft_toLeftOf="@id/tv_price"
        app:layout_constraintTop_toBottomOf="@id/tv_price" />

    <!-- 设置 hotView 紧贴屏幕右侧，且顶部与 areaView 顶部对齐-->
    <TextView
        android:id="@+id/tv_curr_hot"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="当前人气89"
        android:textSize="13sp"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toTopOf="@id/tv_area" />

    <!-- dividerView 位于整个布局的最底部，且始终位于 ivLogo 底部，并保持一定距离 -->
    <View
        android:layout_width="match_parent"
        android:layout_height="1px"
        android:layout_marginTop="7dp"
        android:background="@android:color/darker_gray"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintTop_toBottomOf="@id/iv_logo" />

</android.support.constraint.ConstraintLayout>
```

可以发现使用约束布局实现比普通的 RL 实现还要简单，界面完全实现扁平化，没有任何嵌套。如果使用 LL 或者 RL 来实现同样的效果，代码要复杂多少想必不用我多说。



#### Bias 偏向

以上的内容就是基本使用了，把上下左右各种参考、依赖关系搞明白，本身没有多么复杂，使用起来也和 RL 差不多，下面来介绍一些新花样。

`bias` 很好理解，正如其英文本意一样，它表达的是**偏移**。当某一布局同时受两个相反方向的约束力时，该布局就会处于约束它的那两个力量的正中央。而 `layout_constraintHorizontal_bias` 与 `layout_constraintVertical_bias` 就是用在这种时候，用来将某一方向的约束力减弱。来自两侧的约束力可以为 parent，也可以是普通 View。

文字描述可能有点抽象，具体布局文件还是更好理解一些：

```xml
<android.support.constraint.ConstraintLayout 
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <TextView
        android:id="@+id/tv1"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="this is a text"
        app:layout_constraintLeft_toLeftOf="parent" />

    <TextView
        android:id="@+id/tv2"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="this is a text"
        app:layout_constraintHorizontal_bias="0.3"
        app:layout_constraintLeft_toRightOf="@id/tv1"
        app:layout_constraintRight_toLeftOf="@id/tv3" />

    <TextView
        android:id="@+id/tv3"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="this is a text"
        app:layout_constraintRight_toRightOf="parent" />

</android.support.constraint.ConstraintLayout>
```

布局很简单，三个 TextView 并排显示，左右两个分别紧贴父布局，中间一个受左右两侧布局约束，本来应该是位于两个 TextView 正中央，但是由于设置了 `layout_constraintHorizontal_bias` 小于 0.5，所以最后效果中间的 TextView 整体偏向左侧，展示如下图：

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322145701.jpg)



#### Circle 布局

这个看上去很厉害的！可以令 B 布局以 A 布局为圆心，然后用角度和半径距离来约束两个布局的位置。废话不多说，上图：

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322153304.jpg)这个也很好理解，主要有三个属性：

```
layout_constraintCircle ：      当前布局以哪个布局为圆心
layout_constraintCircleRadius ：半径
layout_constraintCircleAngle ： 摆放角度
```

我反正是给谷歌跪了……

```xml
<android.support.constraint.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    xmlns:app="http://schemas.android.com/apk/res-auto">

    <TextView
        android:id="@+id/tv_center"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toBottomOf="parent"
        android:text="Circle Center"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content" />
    
    <!-- 「测试布局」以 tv_center 为圆心，位于其 135° 方向的 100dp 处 -->
    <TextView
        android:text="测试布局"
        app:layout_constraintCircle="@id/tv_center"
        app:layout_constraintCircleAngle="135"
        app:layout_constraintCircleRadius="100dp"
        android:textColor="@android:color/black"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content" />

</android.support.constraint.ConstraintLayout>
```



#### 替代 MATCH_PARENT 的 MATCH_CONSTRAINT

在约束布局中，由于布局受各方约束控制，也就没有所谓的「match_parent」了。随之而来的需求则是，左边有个布局约束我，右边还有个布局约束我，然后我就想充满剩余的全部位置，「match_constraint」也就应运而生了。

说起来复杂，其实只需要把对应的 View 宽高设置为 0dp 即可，该 View 就会占据上剩余的所有可用空间。在这种情况下，谷歌给我们提供了几个额外的属性：

```
layout_constraintWidth_min   宽度最小值
layout_constraintHeight_min  高度最小值

layout_constraintWidth_max   宽度最大值
layout_constraintHeight_max  高度最大值

layout_constraintWidth_percent   宽度占剩余位置的百分比
layout_constraintHeight_percent  高度占剩余位置的百分比
```

具体示例如下：

```xml
<android.support.constraint.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <Button
        android:id="@+id/btn1"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Test Button"
        app:layout_constraintLeft_toLeftOf="parent" />

    <Button
        android:id="@+id/btn2"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Button"
        app:layout_constraintRight_toRightOf="parent" />

    <Button
        android:id="@+id/btn3"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:layout_constrainedWidth="true"
        android:text="Button"
        app:layout_constraintWidth_min="wrap"
        app:layout_constraintWidth_max="wrap"
        app:layout_constraintWidth_percent="0.3"
        app:layout_constraintLeft_toRightOf="@id/btn1"
        app:layout_constraintRight_toLeftOf="@id/btn2" />

</android.support.constraint.ConstraintLayout>
```

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322163826.jpg)



#### Chains 链

如果几个不同的 View 两两发生关联，如下图，则这几个 View 构成了一个 Chains(链)。

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322170158.jpg)

具体布局代码如下：

```xml
<android.support.constraint.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <Button
        android:id="@+id/btn1"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Button"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toLeftOf="@id/btn2" />

    <Button
        android:id="@+id/btn2"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Button"
        app:layout_constraintLeft_toRightOf="@id/btn1"
        app:layout_constraintRight_toLeftOf="@id/btn3" />

    <Button
        android:id="@+id/btn3"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Button"
        app:layout_constraintLeft_toRightOf="@id/btn2"
        app:layout_constraintRight_toRightOf="parent" />

</android.support.constraint.ConstraintLayout>
```

这样这三个 Button 就形成了一个横向的 Chain，在这个链的最左侧的元素成为链头，我们可以在其身上设置一些属性，来决定这个链的展示效果：

该属性为：

```
layout_constraintHorizontal_chainStyle
layout_constraintVertical_chainStyle
```

其取值可以为：spread、spread_inside、packed。

具体样式展示如下：

1. spread，基本上就是按照权重等分

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322171443.jpg)

2. spread_inside，也是等分展示，但是两侧吸附

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322171444.jpg)

3. packed，整条链挤在一起，居中展示

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322171442.jpg)

官网有一个图来展示不同样式的 Chains，可以参考一下，也很形象：

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322172439.jpg)



#### 虚拟辅助视图

与以往的 ViewGroup 不同，ConstraintLayout 还提供了几种辅助页面绘制的布局，这种布局一般表现为引导线之类，不会在页面上绘制，但是可以通过占位的方式，成为不同布局的约束条件。

##### GuideLine

顾名思义，GuideLine 可以创建基于父布局 ConstraintLayout 的水平或者垂直准线，从而帮助开发者进行布局定位。

这个布局有四个基本属性，依次为：

```xml
orientation 如上所述，用来表示是垂直方向还是竖直方向
layout_constraintGuide_begin 距离父亲的起始位置
layout_constraintGuide_end 距离父亲的结束位置
layout_constraintGuide_percent 距离父亲的位置，用百分比表示

经过试验，percent 优先级最高，其次是 begin，最后是 end，一般来讲使用 percent 就足够了
```

xml 以及对应的页面效果如下：

```xml
<android.support.constraint.ConstraintLayout        		
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <!-- 假设说现在需要将 ImageView 摆放到右下角的位置，就可以使用 GL 辅助实现-->
    <android.support.constraint.Guideline
        android:id="@+id/gl_vertical"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        app:layout_constraintGuide_percent="0.8"/>

    <android.support.constraint.Guideline
        android:id="@+id/gl_horizontal"
        android:layout_width="wrap_content"
        android:layout_height="0dp"
        android:orientation="horizontal"
        app:layout_constraintGuide_percent="0.8" />

    <ImageView
        android:src="@mipmap/ic_launcher"
        app:layout_constraintLeft_toRightOf="@id/gl_vertical"
        app:layout_constraintTop_toBottomOf="@id/gl_horizontal"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content" />

</android.support.constraint.ConstraintLayout>
```

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322174954.jpg)



##### Barrier

与 GuideLine 差不多，但是比它更灵活，可以用来约束多个布局，且自动匹配最大最小值进行约束。

Barrier 有两个基本属性：

- barrierDirection

  >  取值可为 top, bottom, left, right, start, end

  用于约定栅栏拦截的 View 方向，假设说要拦截的 View 在右侧，这个属性就应该为 right 或者 end

- constraint_referenced_ids

  被栅栏保护，屏蔽起来的 View 集合，直接输入 viewId，用逗号分隔即可；barrier 会根据宽度或者高度最大的那个 View 来设置栅栏的边界

可能会有些抽象，我们在开发时可能会遇到一种比较蛋疼的需求：

> 姓名、性别、出生日期、手机号等字段从上到下一字排开，但是每个字段对应的值要保证彼此左侧对齐

讲道理以前这种布局我一直不知道怎么画，但是现在有了 `barrier` 以后这问题就迎刃而解了。我们可以用 barrier 将左侧的那些字段与右侧的值拦截开，barrier 会自动识别最宽的那个字段，并将之作为 barrier 的宽度，之后每个值都用 barrier 来制造约束就可以了。

```XML
<android.support.constraint.ConstraintLayout 
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="10dp">

    <TextView
        android:id="@+id/tv_name"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="姓名:"/>

    <TextView
        android:id="@+id/tv_gender"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:layout_constraintTop_toBottomOf="@id/tv_name"
        android:text="性别:"/>

    <TextView
        android:id="@+id/tv_phone"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:layout_constraintTop_toBottomOf="@id/tv_gender"
        android:text="手机号:"/>

    <TextView
        android:id="@+id/tv_birthday"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:layout_constraintTop_toBottomOf="@id/tv_phone"
        android:text="出生日期:"/>

    <android.support.constraint.Barrier
        android:id="@+id/barrier"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:barrierDirection="end"
        app:constraint_referenced_ids="tv_name,tv_phone,tv_gender,tv_birthday"/>

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:layout_constraintLeft_toRightOf="@id/barrier"
        android:text="易烊千玺"/>

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:layout_constraintTop_toBottomOf="@id/tv_name"
        app:layout_constraintLeft_toRightOf="@id/barrier"
        android:text="男"/>

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:layout_constraintLeft_toRightOf="@id/barrier"
        app:layout_constraintTop_toBottomOf="@id/tv_gender"
        android:text="13800138000"/>

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        app:layout_constraintLeft_toRightOf="@id/barrier"
        app:layout_constraintTop_toBottomOf="@id/tv_phone"
        android:text="2000年1月1日" />

</android.support.constraint.ConstraintLayout>
```

显示效果如图，很完美有没有？

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322182306.jpg)



##### Group

Group 是一个组，用来批量控制 View 的显示与隐藏；但是注意这不是个 ViewGroup，它只是一个不执行绘制的 View，和 barrier 一样，它有一个 constraint_referenced_ids 的属性，可以将需要隐藏的 ViewId 丢进去，在需要的时候将其批量隐藏即可。

还通过上面的例子，假设现在要把性别一栏隐藏掉：

```xml
<android.support.constraint.Group
    app:constraint_referenced_ids="tv_gender,tv_sex_value"
    android:visibility="gone"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content" />
```

通过将性别的 key 和 value 的 id 都放进去，将其设置为 gone，则可以将该组实现隐藏：

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190322183030.jpg)

但是，使用 Group 控制可见性是有坑的：

> 1. 和以前用的ViewGroup有一点不同，以前用ViewGroup约束View的时候，外层ViewGroup设置成可见，里层View设置成不可见是可以生效的，但是用Group就不能。Group约束的元素的可见性始终一致。
>
> 2. 调用Group的setVisibility方法不会立即对它约束对子View生效，而是要等到Group所在的ConstrainLayout调用preLayout方法时才会生效。preLayout只有在第一次layout和布局发生变化时才会调用。



#### Optimizer优化

可以通过将标签app：layout_optimizationLevel元素添加到 ConstraintLayout 来决定应用哪些优化

```xml
<android.support.constraint.ConstraintLayout 
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:layout_optimizationLevel="standard|dimensions|chains"/>
```

- none： 不执行优化
- standard： 默认，仅优化直接和障碍约束
- direct： 优化直接约束
- barrier： 优化障碍约束
- chain：优化链条约束
- dimensions：优化维度测量，减少匹配约束元素的度量数量



#### 参考文章

- [ConstraintLayout 全解析](https://juejin.im/post/5c0bd6b05188257c3045dc50#heading-7)
- [拒绝拖拽 使用ConstraintLayout优化你的布局吧](<https://mp.weixin.qq.com/s/vI-fPaNoJ7ZBlZcMkEGdLQ>)