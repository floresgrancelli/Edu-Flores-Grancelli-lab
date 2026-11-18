import SwiftUI

@MainActor
struct ActivityConnectionView: View {
    @State private var reader = DailyHealthActivityReader()
    @State private var snapshot: DailyHealthActivity?
    @State private var status = ""
    @State private var busy = false

    var body: some View {
        Form {
            Section("Actividad de hoy") {
                LabeledContent("Pasos", value: metric(snapshot?.steps))
                LabeledContent("Distancia (km)", value: metric(snapshot?.distanceMeters.map { $0 / 1000 }))
                LabeledContent("Calorías activas (kcal)", value: metric(snapshot?.activeKilocalories))
            }
            Section {
                Button("Conectar Apple Salud") {
                    Task { await refresh(askPermission: true) }
                }
                .disabled(busy)
                if !status.isEmpty { Text(status) }
            } footer: {
                Text("Esta prueba muestra en el iPhone solo los totales que autorices en Salud.")
            }
        }
        .task { await refresh(askPermission: false) }
    }

    private func metric(_ value: Double?) -> String {
        value?.formatted(.number.precision(.fractionLength(0...2))) ?? "Sin dato"
    }

    private func refresh(askPermission: Bool) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            if askPermission { try await reader.requestReadAccess() }
            let activity = try await reader.readToday()
            snapshot = activity
            status = activity.steps == nil && activity.distanceMeters == nil && activity.activeKilocalories == nil
                ? "Todavía no hay datos disponibles para hoy." : ""
        } catch {
            snapshot = nil
            status = "No pudimos leer la actividad de Apple Salud."
        }
    }
}
