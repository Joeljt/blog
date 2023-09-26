---
title: java中多态的具体应用

tags: java基础

date: 2018-03-9
---



实际使用多态时，关于成员变量和成员函数的调用，在编译期和运行时有所不同，具体代码示例

```
// 父类
public class Parent {
    public int aInt = -1;
    public void func1() {
        System.err.print(" Parent func1 ");
    }
    public void func2() {
        System.err.print(" Parent func2 ");
    }
}
```

```
// 子类
public class Child extends Parent {
    public int aInt = 1;
    public void func1() {
        System.err.print(" Child func1 ");
    }
    public void func3() {
        System.err.print(" Child func3 ");
    }
}
```

#### 成员函数
```
// test main()
public static void main(String[] args) {
    Child child = new Child();
    child.func1();
    child.func2();
    child.func3();

    Parent parent = new Child();
    parent.func1();
    parent.func2();
    parent.func3();
}
```
如上所示，将对象声明为Child对象时，三个方法都编译通过，且输入结果如下：
```
Child func1
Parent func2
Child func3
```
Child类重写了父类的func1()方法，则在运行时匹配了子类自身的重写方法，即，「运行时遵循右侧声明」。
但是，如果将对象声明为Parent对象时，parent.fun3()则会报错，因为「编译期遵循左侧实例」，当前对象被声明为Parent实例，而Parent中没有func3()方法，所以编译不通过。同时也正因为「运行时遵循右侧声明」，所以其运行结果如下：
```
Child func1 // 尽管声明为Parent实例，但实际调用Child的方法
Parent func2
```
综上所述，在多态使用时，成员函数遵循两个原则，即「编译期遵循左侧实例，运行时遵循右侧声明」

#### 成员变量
```
// test main()
public static void main(String[] args) {
    Parent parent = new Child();
    Child child = new Child();
    System.err.println(parent.aInt);
    System.err.println(child.aInt);
}
```
运行结果如下：
```
-1
1
```
可以发现，打印结果与成员函数有所不同。因为如果是成员函数，运行时遵循右侧声明的话，打印结果应该相等，同为1才对。因此，成员变量在多态情境下的使用，无论编译还是运行，通通遵循左侧实例。

#### 总结
* 成员函数
  编译时遵循左侧实例，运行时遵循右侧声明
* 成员变量
  编译或者运行一律遵循左侧实例

其实也比较好理解，编译期间，当前类下不存在的成员函数或成员变量，肯定是无法被实例对象获取到的；
而在运行时，java中子类可以重写父类的方法，因此成员函数运行时会正确指向子类的方法，但是，子类并不可以重写父类的变量，当子类与父类有同名变量时，需要使用this和super关键字进行区分。在这种情况下，成员变量的访问则不可能像方法一样使用多态访问，因此只能是遵循左侧的实例了。