package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strings"

	recordservice "my/module/record/service"
)

func main() {
	totalUSD := flag.Float64("total", 5_000_000, "初始组合目标美元估值")
	apply := flag.Bool("apply", false, "实际写入数据库；默认只预览")
	reset := flag.Bool("reset", true, "写入前清空账户流水和持仓")
	flag.Parse()

	result, err := recordservice.AllocateInitialPortfolio(context.Background(), recordservice.PortfolioAllocationOptions{
		TotalUSD: *totalUSD,
		Apply:    *apply,
		Reset:    *reset,
	})
	if err != nil {
		log.Fatal(err)
	}

	printResult(result)
	if !result.Applied {
		fmt.Println()
		fmt.Println("当前为预览模式；确认后执行：go run ./module/record/cmd/allocate --apply")
	}
}

func printResult(result recordservice.PortfolioAllocationResult) {
	mode := "预览"
	if result.Applied {
		mode = "已写入"
	}
	fmt.Printf("模式: %s\n", mode)
	fmt.Printf("重置旧流水/持仓: %v\n", result.Reset)
	fmt.Printf("目标总估值: %.2f USD\n", result.TotalTargetUSD)
	fmt.Printf("计划总估值: %.2f USD\n", result.TotalActualUSD)
	fmt.Println(strings.Repeat("-", 96))
	fmt.Printf("%-10s %-14s %-8s %-8s %14s %14s %14s\n", "分类", "账户", "链", "资产", "价格USD", "目标USD", "数量")
	for _, item := range result.Items {
		fmt.Printf(
			"%-10s %-14s %-8s %-8s %14.8f %14.2f %14.8f\n",
			item.CategoryName,
			item.AccountName,
			item.ChainType,
			item.AssetSymbol,
			item.PriceUSD,
			item.TargetUSD,
			item.Quantity,
		)
	}
}
