"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clock,
  DollarSign,
  Minus,
  Users,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type IconType =
  | React.ElementType
  | React.FunctionComponent<React.SVGProps<SVGSVGElement>>

export type TrendType = "up" | "down" | "neutral"

export interface DashboardMetricCardProps {
  value: string
  title: string
  icon?: IconType
  trendChange?: string
  trendType?: TrendType
  className?: string
}

const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  value,
  title,
  icon: IconComponent,
  trendChange,
  trendType = "neutral",
  className,
}) => {
  const TrendIcon =
    trendType === "up" ? ArrowUp : trendType === "down" ? ArrowDown : Minus
  const trendColorClass =
    trendType === "up"
      ? "text-green-400"
      : trendType === "down"
        ? "text-red-400"
        : "text-muted-foreground"

  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow:
          "0 14px 30px -12px rgb(0 0 0 / 0.45), 0 10px 18px -12px rgb(0 0 0 / 0.3)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn("cursor-pointer rounded-lg", className)}
    >
      <Card className="h-full border-white/10 bg-white/5 transition-colors duration-200 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {IconComponent && (
            <IconComponent
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-2 text-2xl font-bold text-foreground">{value}</div>
          {trendChange && (
            <p className={cn("flex items-center text-xs font-medium", trendColorClass)}>
              <TrendIcon className="mr-1 h-3 w-3" aria-hidden="true" />
              {trendChange}{" "}
              {trendType === "up"
                ? "increase"
                : trendType === "down"
                  ? "decrease"
                  : "change"}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function DashboardOverview() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Dashboard
          </p>
          <h3 className="text-2xl font-semibold text-foreground">
            Visao geral da operacao
          </h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Um resumo rapido dos principais indicadores para acompanhar equipe,
            receita, sessao media e tickets em aberto.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardMetricCard
            title="Total Users"
            value="2,350"
            icon={Users}
            trendChange="+180"
            trendType="up"
          />
          <DashboardMetricCard
            title="Revenue"
            value="$12,450"
            icon={DollarSign}
            trendChange="-2.5%"
            trendType="down"
          />
          <DashboardMetricCard
            title="Avg. Session"
            value="4m 32s"
            icon={Clock}
            trendChange="+0.5s"
            trendType="neutral"
          />
          <DashboardMetricCard
            title="Open Tickets"
            value="12"
            icon={AlertCircle}
            trendChange="+3"
            trendType="up"
          />
        </div>
      </div>
    </div>
  )
}
