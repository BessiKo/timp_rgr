package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

type BoilerStats struct {
	Voltage  int     `json:"voltage"`
	Current  float64 `json:"current"`
	Pressure float64 `json:"pressure"`
}

type ArchiveRecord struct {
	Timestamp string  `json:"timestamp"`
	Voltage   int     `json:"voltage"`
	Current   float64 `json:"current"`
	Pressure  float64 `json:"pressure"`
}

type LogResponse struct {
	DeviceUID    string          `json:"deviceUid"`
	ExportedAt   string          `json:"exportedAt"`
	RecordsCount int             `json:"recordsCount"`
	History      []ArchiveRecord `json:"history"`
}

type CommandRequest struct {
	Command  string `json:"command"`
	BoilerID interface{} `json:"boilerId"`
}

var (
	mu           sync.RWMutex
	currentStats = BoilerStats{Voltage: 220, Current: 10.0, Pressure: 4.0}
	archive      = make([]ArchiveRecord, 0)
	maxLogSize   = 500
	updateTick   = 1 * time.Second
	isRunning    atomic.Bool
	serverCtx    context.Context
	serverCancel context.CancelFunc
)

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func isShutdown(w http.ResponseWriter, r *http.Request) bool {
	if !isRunning.Load() {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"error":"system_shutdown"}`))
		return true
	}
	return false
}

func generateNextStats() {
	currentStats.Voltage += rand.Intn(9) - 4
	if currentStats.Voltage < 180 {
		currentStats.Voltage = 180
	}
	if currentStats.Voltage > 240 {
		currentStats.Voltage = 240
	}

	currentStats.Current += (rand.Float64() - 0.5) * 0.8
	if currentStats.Current < 2 {
		currentStats.Current = 2
	}
	if currentStats.Current > 15 {
		currentStats.Current = 15
	}
	currentStats.Current = float64(int(currentStats.Current*10)) / 10

	targetPressure := 4.0
	currentStats.Pressure += (targetPressure - currentStats.Pressure) * 0.1
	currentStats.Pressure += (rand.Float64() - 0.5) * 0.2

	if currentStats.Pressure < 0 {
		currentStats.Pressure = 0
	}
	currentStats.Pressure = float64(int(currentStats.Pressure*10)) / 10
}

func saveToArchive() {
	record := ArchiveRecord{
		Timestamp: time.Now().Format(time.RFC3339),
		Voltage:   currentStats.Voltage,
		Current:   currentStats.Current,
		Pressure:  currentStats.Pressure,
	}

	archive = append(archive, record)
	if len(archive) > maxLogSize {
		archive = archive[1:]
	}
}

func statsUpdateLoop() {
	ticker := time.NewTicker(updateTick)
	for range ticker.C {
		if !isRunning.Load() {
			continue
		}
		mu.Lock()
		generateNextStats()
		saveToArchive()
		mu.Unlock()
	}
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	if isShutdown(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	mu.RLock()
	responseBytes, err := json.Marshal(currentStats)
	mu.RUnlock()

	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(responseBytes)
}

func handleCommand(w http.ResponseWriter, r *http.Request) {
	if isShutdown(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CommandRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	mu.Lock()
	if req.Command == "open_valve" {
		currentStats.Pressure -= 1.2
		if currentStats.Pressure < 0 {
			currentStats.Pressure = 0
		}
	} else if req.Command == "release_steam" {
		currentStats.Pressure += 1.5
		currentStats.Current += 1.0
	}
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"success"}`))
}

func handleLogs(w http.ResponseWriter, r *http.Request) {
	if isShutdown(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	boilerID := r.URL.Query().Get("boilerId")
	if boilerID == "" {
		boilerID = "SINGLE_UNIT_NODE"
	}

	mu.RLock()
	historyCopy := make([]ArchiveRecord, len(archive))
	copy(historyCopy, archive)
	mu.RUnlock()

	res := LogResponse{
		DeviceUID:    boilerID,
		ExportedAt:   time.Now().Format(time.RFC3339),
		RecordsCount: len(historyCopy),
		History:      historyCopy,
	}

	responseBytes, err := json.Marshal(res)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(responseBytes)
}

func handleEmergencyShutdown(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	isRunning.Store(false)

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"emergency_shutdown_initiated"}`))
}

func handleResume(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	mu.Lock()
	currentStats.Pressure = 4.0
	mu.Unlock()

	isRunning.Store(true)

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"resumed"}`))
}

func main() {
	addrPtr := flag.String("addr", "localhost:1910", "Network address to listen on")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())
	serverCtx, serverCancel = context.WithCancel(context.Background())
	isRunning.Store(true)

	go statsUpdateLoop()

	http.HandleFunc("/api/boiler/stats", corsMiddleware(handleStats))
	http.HandleFunc("/api/boiler/command", corsMiddleware(handleCommand))
	http.HandleFunc("/api/boiler/logs", corsMiddleware(handleLogs))
	http.HandleFunc("/api/boiler/emergency-shutdown", corsMiddleware(handleEmergencyShutdown))
	http.HandleFunc("/api/boiler/resume", corsMiddleware(handleResume))

	srv := &http.Server{
		Addr:    *addrPtr,
		Handler: nil,
	}

	fmt.Printf("Engine node started. Listening on http://%s\n", *addrPtr)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Fatal server shutdown: %v", err)
		}
	}()

	<-serverCtx.Done()
	log.Println("Emergency shutdown: stopping server")
}
