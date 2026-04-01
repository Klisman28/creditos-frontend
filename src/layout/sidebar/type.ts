export interface ChildNavItem {
  label: string;
  route: string;
  /** If set, only these roles can see this child item */
  roles?: string[];
}

export interface NavItem {
  icon: string;
  route?: string;
  label: string;
  children?: ChildNavItem[];
  /** If set, only these roles can see this item */
  roles?: string[];
}

export interface NavGroup {
  id: number;
  name: string;
  menu: NavItem[];
  /** If set, only these roles can see this entire group */
  roles?: string[];
}
