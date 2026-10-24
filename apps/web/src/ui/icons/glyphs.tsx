// Spec 014, RF-4: iconos secundarios de doble tono (Phosphor, MIT) con los nombres que usaba la interfaz. Cada
// icono se importa por su ruta (no todo el paquete) y en su versión sin contexto, válida en servidor y cliente.
import { forwardRef } from "react";
import type { IconProps } from "@phosphor-icons/react";
import { Pulse as PhActivity } from "@phosphor-icons/react/dist/ssr/Pulse";
import { ArrowDown as PhArrowDown } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowRight as PhArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUp as PhArrowUp } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { Bell as PhBell } from "@phosphor-icons/react/dist/ssr/Bell";
import { BookOpen as PhBookOpen } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { ChartBar as PhChartColumn } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { Check as PhCheck } from "@phosphor-icons/react/dist/ssr/Check";
import { CaretDown as PhChevronDown } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { WarningCircle as PhCircleAlert } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CheckCircle as PhCircleCheck } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { Flask as PhFlaskConical } from "@phosphor-icons/react/dist/ssr/Flask";
import { Gift as PhGift } from "@phosphor-icons/react/dist/ssr/Gift";
import { Image as PhImageIcon } from "@phosphor-icons/react/dist/ssr/Image";
import { Info as PhInfo } from "@phosphor-icons/react/dist/ssr/Info";
import { SquaresFour as PhLayoutGrid } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { Books as PhLibrary } from "@phosphor-icons/react/dist/ssr/Books";
import { Link as PhLink2 } from "@phosphor-icons/react/dist/ssr/Link";
import { CircleNotch as PhLoaderCircle } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { SignOut as PhLogOut } from "@phosphor-icons/react/dist/ssr/SignOut";
import { List as PhMenu } from "@phosphor-icons/react/dist/ssr/List";
import { Package as PhPackage } from "@phosphor-icons/react/dist/ssr/Package";
import { Percent as PhPercent } from "@phosphor-icons/react/dist/ssr/Percent";
import { Plus as PhPlus } from "@phosphor-icons/react/dist/ssr/Plus";
import { Repeat as PhRepeat } from "@phosphor-icons/react/dist/ssr/Repeat";
import { MagnifyingGlass as PhSearch } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { GearSix as PhSettings } from "@phosphor-icons/react/dist/ssr/GearSix";
import { Shield as PhShield } from "@phosphor-icons/react/dist/ssr/Shield";
import { ShieldCheck as PhShieldCheck } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { Sparkle as PhSparkles } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { Trash as PhTrash2 } from "@phosphor-icons/react/dist/ssr/Trash";
import { Warning as PhTriangleAlert } from "@phosphor-icons/react/dist/ssr/Warning";
import { User as PhUserRound } from "@phosphor-icons/react/dist/ssr/User";
import { Users as PhUsersRound } from "@phosphor-icons/react/dist/ssr/Users";
import { SpeakerHigh as PhVolume2 } from "@phosphor-icons/react/dist/ssr/SpeakerHigh";
import { SpeakerSlash as PhVolumeX } from "@phosphor-icons/react/dist/ssr/SpeakerSlash";
import { X as PhX } from "@phosphor-icons/react/dist/ssr/X";

export interface GlyphProps extends IconProps {
  /** Se acepta por compatibilidad con los iconos anteriores; el grosor lo da el doble tono. */
  strokeWidth?: number;
}
export type Glyph = React.ForwardRefExoticComponent<GlyphProps & React.RefAttributes<SVGSVGElement>>;

export function duotone(Icon: React.ComponentType<IconProps & React.RefAttributes<SVGSVGElement>>, name: string): Glyph {
  const G = forwardRef<SVGSVGElement, GlyphProps>(function Glyph({ strokeWidth, weight = "duotone", ...rest }, ref) {
    void strokeWidth;
    return <Icon ref={ref} weight={weight} {...rest} />;
  });
  G.displayName = name;
  return G;
}

export const Activity = duotone(PhActivity, "Activity");
export const ArrowDown = duotone(PhArrowDown, "ArrowDown");
export const ArrowRight = duotone(PhArrowRight, "ArrowRight");
export const ArrowUp = duotone(PhArrowUp, "ArrowUp");
export const Bell = duotone(PhBell, "Bell");
export const BookOpen = duotone(PhBookOpen, "BookOpen");
export const ChartColumn = duotone(PhChartColumn, "ChartColumn");
export const Check = duotone(PhCheck, "Check");
export const ChevronDown = duotone(PhChevronDown, "ChevronDown");
export const CircleAlert = duotone(PhCircleAlert, "CircleAlert");
export const CircleCheck = duotone(PhCircleCheck, "CircleCheck");
export const FlaskConical = duotone(PhFlaskConical, "FlaskConical");
export const Gift = duotone(PhGift, "Gift");
export const ImageIcon = duotone(PhImageIcon, "ImageIcon");
export const Info = duotone(PhInfo, "Info");
export const LayoutGrid = duotone(PhLayoutGrid, "LayoutGrid");
export const Library = duotone(PhLibrary, "Library");
export const Link2 = duotone(PhLink2, "Link2");
export const LoaderCircle = duotone(PhLoaderCircle, "LoaderCircle");
export const LogOut = duotone(PhLogOut, "LogOut");
export const Menu = duotone(PhMenu, "Menu");
export const Package = duotone(PhPackage, "Package");
export const Percent = duotone(PhPercent, "Percent");
export const Plus = duotone(PhPlus, "Plus");
export const Repeat = duotone(PhRepeat, "Repeat");
export const Search = duotone(PhSearch, "Search");
export const Settings = duotone(PhSettings, "Settings");
export const Shield = duotone(PhShield, "Shield");
export const ShieldCheck = duotone(PhShieldCheck, "ShieldCheck");
export const Sparkles = duotone(PhSparkles, "Sparkles");
export const Trash2 = duotone(PhTrash2, "Trash2");
export const TriangleAlert = duotone(PhTriangleAlert, "TriangleAlert");
export const UserRound = duotone(PhUserRound, "UserRound");
export const UsersRound = duotone(PhUsersRound, "UsersRound");
export const Volume2 = duotone(PhVolume2, "Volume2");
export const VolumeX = duotone(PhVolumeX, "VolumeX");
export const X = duotone(PhX, "X");
