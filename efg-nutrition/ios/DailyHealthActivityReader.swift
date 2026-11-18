import Foundation
import HealthKit

struct DailyHealthActivity {
    let day: DateComponents
    let steps: Double?
    let distanceMeters: Double?
    let activeKilocalories: Double?
}

@MainActor
final class DailyHealthActivityReader {
    private let store = HKHealthStore()
    private let steps = HKQuantityType(.stepCount)
    private let distance = HKQuantityType(.distanceWalkingRunning)
    private let energy = HKQuantityType(.activeEnergyBurned)

    func requestReadAccess() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw ReaderError.unavailable
        }
        let types: Set<HKObjectType> = [steps, distance, energy]
        try await store.requestAuthorization(toShare: [], read: types)
    }

    func readToday(now: Date = Date()) async throws -> DailyHealthActivity {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw ReaderError.unavailable
        }
        guard let zone = TimeZone(identifier: "America/Argentina/Buenos_Aires") else {
            throw ReaderError.invalidTimeZone
        }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let start = calendar.startOfDay(for: now)
        let day = calendar.dateComponents([.year, .month, .day], from: now)
        guard now > start else {
            return DailyHealthActivity(day: day, steps: nil, distanceMeters: nil, activeKilocalories: nil)
        }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: now, options: .strictStartDate)

        // HealthKit does not disclose whether read permission was denied.
        // A missing sum is represented as nil instead of a zero reading.
        return try await DailyHealthActivity(
            day: day,
            steps: sum(steps, unit: .count(), predicate: predicate),
            distanceMeters: sum(distance, unit: .meter(), predicate: predicate),
            activeKilocalories: sum(energy, unit: .kilocalorie(), predicate: predicate)
        )
    }

    private func sum(_ type: HKQuantityType, unit: HKUnit, predicate: NSPredicate) async throws -> Double? {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum
            ) { _, result, error in
                if let healthError = error as? HKError, healthError.code == .errorNoData {
                    continuation.resume(returning: nil)
                } else if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: result?.sumQuantity()?.doubleValue(for: unit))
                }
            }
            store.execute(query)
        }
    }

    enum ReaderError: Error {
        case unavailable
        case invalidTimeZone
    }
}
