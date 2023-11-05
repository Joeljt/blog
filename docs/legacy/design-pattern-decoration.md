---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: 装饰者设计模式
tags: [design-pattern]
date: 2019-11-01
---



今天说一下装饰者。



<!-- more -->


#### 模式定义

一般来讲，我们扩展某个类的功能可以使用继承或者接口实现的方式，装饰者模式则是第三种扩展方式，可以动态扩展某个对象的功能。

简单来说就是，在不使用接口或者继承的前提下，以最小侵入性对某个对象的功能进行扩展，使其获得原本不具备的能力。

这里我们通过分析系统源码，来看看 ListView 是怎么优先于 RecyclerView，拥有自己的 addHeaderView() 方法为例，进行装饰者模式的说明。



#### ListView#addHeaderView

有过开发经验的人都知道，尽管 RecyclerView 在各方面都领先于 ListView，但是有一点却不如 ListView，那就是 ListView 支持添加头部布局，而 RecyclerView 却并不支持。

当我们从 ListView#addHeaderView 的源码入手，看一看 ListView 是怎么实现添加头布局的时候，就会发现 ListView 本身也是不支持添加头部的，系统源码也是使用了装饰者模式，来为 ListView 进行了功能扩展。

下面我们来看一下 ListView#addHeaderView 的源码。

```java
public void addHeaderView(View v, Object data, boolean isSelectable) {
  // Wrap the adapter if it wasn't already wrapped.
  if (mAdapter != null) {
    if (!(mAdapter instanceof HeaderViewListAdapter)) {
      wrapHeaderListAdapterInternal();
    }

    // In the case of re-adding a header view, or adding one later on,
    // we need to notify the observer.
    if (mDataSetObserver != null) {
      mDataSetObserver.onChanged();
    }
  }
}
```

在方法内部判断中，我们会发现如果 adapter 不是 HeaderViewListAdapter 的实例的话，会调用 `wrapHeaderListAdapterInternal()` 将它变成该类的实例，然后通过一个观察者来进行 onChanged 更新。再看这个类的名字 HeaderViewListAdapter，很明显 ListView 添加头部和它少不了干系。

```java
public class HeaderViewListAdapter implements WrapperListAdapter, Filterable {

    private final ListAdapter mAdapter;

    ArrayList<ListView.FixedViewInfo> mHeaderViewInfos;
    ArrayList<ListView.FixedViewInfo> mFooterViewInfos;

    public HeaderViewListAdapter(ArrayList<ListView.FixedViewInfo> headerViewInfos,
                                 ArrayList<ListView.FixedViewInfo> footerViewInfos,
                                 ListAdapter adapter) {
        mAdapter = adapter;
				
    }

    public int getHeadersCount() {
        return mHeaderViewInfos.size();
    }

    public int getFootersCount() {
        return mFooterViewInfos.size();
    }

    public int getCount() {
        if (mAdapter != null) {
            return getFootersCount() + getHeadersCount() + mAdapter.getCount();
        } else {
            return getFootersCount() + getHeadersCount();
        }
    }
  
    public View getView(int position, View convertView, ViewGroup parent) {
        // Header (negative positions will throw an IndexOutOfBoundsException)
        int numHeaders = getHeadersCount();
        if (position < numHeaders) {
            return mHeaderViewInfos.get(position).view;
        }

        // Adapter
        final int adjPosition = position - numHeaders;
        int adapterCount = 0;
        if (mAdapter != null) {
            adapterCount = mAdapter.getCount();
            if (adjPosition < adapterCount) {
                return mAdapter.getView(adjPosition, convertView, parent);
            }
        }

        // Footer (off-limits positions will throw an IndexOutOfBoundsException)
        return mFooterViewInfos.get(adjPosition - adapterCount).view;
    }

}
```

上面是我将 HeaderViewListAdapter 类的代码进行适当删减后留下的样子。我们认真观察后会发现，所谓的头部和底部，都是在这个类中声明的，而原本的 ListAdapter 也是通过此类的构造器传入的。

1. 在 getCount 方法中，正常我们是返回列表集合数据的大小；而在这个带头部底部添加功能的装饰 adapter 中，getCount 的返回值是头部数据 + 列表数据 + 底部数据；

2. 在 getView 方法中，通过对当前位置以及头部集合大小、底部集合大小的对比和校正，来返回适合的数据：

  - 如果当前位置小于头部元素集合，说明当前是头部位置，返回对应的头部元素

    > return mHeaderViewInfos.get(position).view;

  - 利用头部元素集合大小和 adapter 元素大小来做数据校准：当前位置 - 头部大小 = 列表元素位置，列表元素的位置有上限，即 头部元素 + 列表元素总和；

    满足这个区间的数据，都是 adapter 的列表数据，应该由 adapter 自己去处理

    > return mAdapter.getView(adjPosition, convertView, parent);

  - 超出这个范围的，应该都是用户手动添加的底部元素

    > return mFooterViewInfos.get(adjPosition - adapterCount).view;



#### 总结

同理，我们也可以仿照系统源码来对 RecyclerView 进行添加头部和底部的扩展。

装饰者模式可以非常灵活地为目标对象添加方法，添加新的行为动作，但是相应的，也需要进行更多的代码维护和判断，来保证代码的兼容性和可用性。

举个很简单的例子，我们在上边简单的分析中没有提到，在平时使用的时候，我们一般都是 listView.addHeaderView(), 但是我们会发现在上边的分析中，addHeaderView 的动作是 adapter，而且是 wrapper 类 adapter 来实现的，那我们怎么保证使用 listView 来进行调用，这就是上边我们简单提到的观察者的作用了。

所以很明显，尽管我们为原始的对象添加了功能，但是也因此导致了很多原本不需要的兼容和维护工作。

