import React from 'react';
import {
  User as UserIcon,
  DollarSign as DollarSignIcon,
  CheckCircle as CheckCircleIcon,
  Calendar as CalendarIcon,
  AlertTriangle as AlertTriangleIcon,
  UserPlus as UserPlusIcon,
  Lightbulb as LightbulbIcon,
  BarChart2 as BarChart2Icon,
  Trophy as TrophyIcon,
  ShieldCheck as ShieldCheckIcon,
  Heart as HeartIcon,
  Rocket as RocketIcon,
  Zap as ZapIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  CalendarCheck as CalendarCheckIcon,
  Bell as BellIcon,
  Clock as ClockIcon,
  Users as UsersIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  School as SchoolIcon,
  Upload as UploadIcon,
  AlertCircle as AlertCircleIcon,
  Wallet as WalletIcon,
  Users2 as Users2Icon
} from 'lucide-react';

type IconInput = string | React.ReactNode | React.ComponentType<any>;

export function getIcon(icon: IconInput, className = ''): React.ReactNode {
  if (!icon) return null;

  // If icon is already a React element, return it with merged className if possible
  if (React.isValidElement(icon)) {
    // if it's an element, clone and merge className prop
    return React.cloneElement(icon as React.ReactElement, ({
      className: [className, (icon as any).props?.className].filter(Boolean).join(' ')
    } as any));
  }

  // If icon is a component (function/class), create element with className
  if (typeof icon === 'function') {
    return React.createElement(icon as React.ComponentType<any>, { className });
  }

  // string-based icon mapping
  if (typeof icon !== 'string') return null;

  switch (icon) {
    case 'ri-user-line':
      return <UserIcon className={className} />;
    case 'ri-money-dollar-circle-line':
      return <DollarSignIcon className={className} />;
    case 'ri-check-double-line':
    case 'ri-checkbox-circle-line':
      return <CheckCircleIcon className={className} />;
    case 'ri-calendar-line':
      return <CalendarIcon className={className} />;
    case 'ri-calendar-check-line':
      return <CalendarCheckIcon className={className} />;
    case 'ri-alert-line':
    case 'ri-alarm-warning-line':
      return <AlertTriangleIcon className={className} />;
    case 'ri-user-add-line':
      return <UserPlusIcon className={className} />;
    case 'ri-lightbulb-line':
      return <LightbulbIcon className={className} />;
    case 'ri-line-chart-line':
      return <BarChart2Icon className={className} />;
    case 'ri-trophy-line':
      return <TrophyIcon className={className} />;
    case 'ri-shield-check-line':
      return <ShieldCheckIcon className={className} />;
    case 'ri-heart-line':
      return <HeartIcon className={className} />;
    case 'ri-rocket-line':
      return <RocketIcon className={className} />;
    case 'ri-brain-line':
      return <ZapIcon className={className} />;
    case 'ri-star-line':
      return <StarIcon className={className} />;
    case 'ri-trending-up-line':
      return <TrendingUpIcon className={className} />;
    case 'ri-notification-line':
      return <BellIcon className={className} />;
    case 'ri-time-line':
      return <ClockIcon className={className} />;
    case 'ri-team-line':
      return <UsersIcon className={className} />;
    case 'ri-line-chart-line':
      return <BarChart2Icon className={className} />;
    case 'ri-arrow-up-line':
      return <ArrowUpIcon className={className} />;
    case 'ri-arrow-down-line':
      return <ArrowDownIcon className={className} />;
    case 'ri-school-line':
      return <SchoolIcon className={className} />;
    case 'ri-upload-cloud-line':
      return <UploadIcon className={className} />;
    case 'ri-group-line':
      return <Users2Icon className={className} />;
    case 'ri-money-rupee-circle-line':
      return <WalletIcon className={className} />;
    case 'ri-alert-circle-line':
      return <AlertCircleIcon className={className} />;
    default:
      // fallback to a lucide icon for any unmapped key to avoid using icon-font <i> tags
      return <AlertCircleIcon className={className} />;
  }
}

export default getIcon;
