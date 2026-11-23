package com.akon.subtools.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseExpandableListAdapter;
import android.widget.ImageView;
import android.widget.TextView;

import com.akon.subtools.R;

import java.util.List;

public class DrawerExpandableAdapter extends BaseExpandableListAdapter {
    private final Context context;
    private final List<GroupItem> groupList;

    public static class ChildItem {
        public String title;
        public int iconResId;
        public int destinationId;
        public String badge;

        public ChildItem(String title, int iconResId, int destinationId, String badge) {
            this.title = title;
            this.iconResId = iconResId;
            this.destinationId = destinationId;
            this.badge = badge;
        }
    }

    public static class GroupItem {
        public String title;
        public int iconResId;
        public int destinationId; // 0 if parent group with children
        public List<ChildItem> children;

        public GroupItem(String title, int iconResId, int destinationId, List<ChildItem> children) {
            this.title = title;
            this.iconResId = iconResId;
            this.destinationId = destinationId;
            this.children = children;
        }
    }

    public DrawerExpandableAdapter(Context context, List<GroupItem> groupList) {
        this.context = context;
        this.groupList = groupList;
    }

    @Override
    public int getGroupCount() {
        return groupList.size();
    }

    @Override
    public int getChildrenCount(int groupPosition) {
        List<ChildItem> children = groupList.get(groupPosition).children;
        return children != null ? children.size() : 0;
    }

    @Override
    public Object getGroup(int groupPosition) {
        return groupList.get(groupPosition);
    }

    @Override
    public Object getChild(int groupPosition, int childPosition) {
        return groupList.get(groupPosition).children.get(childPosition);
    }

    @Override
    public long getGroupId(int groupPosition) {
        return groupPosition;
    }

    @Override
    public long getChildId(int groupPosition, int childPosition) {
        return childPosition;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }

    @Override
    public View getGroupView(int groupPosition, boolean isExpanded, View convertView, ViewGroup parent) {
        GroupItem group = (GroupItem) getGroup(groupPosition);
        if (convertView == null) {
            convertView = LayoutInflater.from(context).inflate(R.layout.item_drawer_group, parent, false);
        }

        ImageView iconGroup = convertView.findViewById(R.id.icon_group);
        TextView textTitle = convertView.findViewById(R.id.text_group_title);
        ImageView iconArrow = convertView.findViewById(R.id.icon_group_arrow);

        if (group.iconResId != 0) {
            iconGroup.setImageResource(group.iconResId);
            iconGroup.setVisibility(View.VISIBLE);
        } else {
            iconGroup.setVisibility(View.GONE);
        }

        textTitle.setText(group.title);

        if (getChildrenCount(groupPosition) > 0) {
            iconArrow.setVisibility(View.VISIBLE);
            iconArrow.setRotation(isExpanded ? 180f : 0f);
        } else {
            iconArrow.setVisibility(View.GONE);
        }

        return convertView;
    }

    @Override
    public View getChildView(int groupPosition, int childPosition, boolean isLastChild, View convertView, ViewGroup parent) {
        ChildItem child = (ChildItem) getChild(groupPosition, childPosition);
        if (convertView == null) {
            convertView = LayoutInflater.from(context).inflate(R.layout.item_drawer_child, parent, false);
        }

        ImageView iconChild = convertView.findViewById(R.id.icon_child);
        TextView textTitle = convertView.findViewById(R.id.text_child_title);
        TextView textBadge = convertView.findViewById(R.id.text_child_badge);

        if (child.iconResId != 0) {
            iconChild.setImageResource(child.iconResId);
            iconChild.setVisibility(View.VISIBLE);
        } else {
            iconChild.setVisibility(View.GONE);
        }

        textTitle.setText(child.title);

        if (child.badge != null && !child.badge.isEmpty()) {
            textBadge.setText(child.badge);
            textBadge.setVisibility(View.VISIBLE);
        } else {
            textBadge.setVisibility(View.GONE);
        }

        return convertView;
    }

    @Override
    public boolean isChildSelectable(int groupPosition, int childPosition) {
        return true;
    }
}
