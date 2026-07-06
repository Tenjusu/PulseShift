import SwiftUI

struct Shift: Identifiable {
    let id = UUID()
    let facility: String
    let role: String
    let time: String
    let rate: Int
    let distance: String
    let urgent: Bool
    var claimed: Bool = false
    var clockedIn: Bool = false
}

struct ContentView: View {
    @State private var shifts = [
        Shift(facility: "Northline Medical Center", role: "RN", time: "Today, 2:54 PM - 10:54 PM", rate: 68, distance: "3.1 mi", urgent: true, claimed: true),
        Shift(facility: "Harbor Urgent Care", role: "RN", time: "Tomorrow, 7:00 AM - 3:00 PM", rate: 62, distance: "6.4 mi", urgent: false)
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                PulseShiftBackground()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header

                        ForEach($shifts) { $shift in
                            ShiftGlassCard(shift: $shift)
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 28)
                }
            }
            .navigationTitle("Shifts")
            .toolbarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PulseShift")
                .font(.largeTitle.weight(.semibold))
                .accessibilityAddTraits(.isHeader)
            Text("Verified roles: RN, CNA")
                .foregroundStyle(.secondary)
        }
    }
}

struct ShiftGlassCard: View {
    @Binding var shift: Shift

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(shift.facility)
                        .font(.headline)
                    Text("\(shift.role) - \(shift.time)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 6) {
                    Text("$\(shift.rate)/hr")
                        .font(.title3.weight(.bold))
                    Text(shift.distance)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if shift.urgent {
                Label("Urgent", systemImage: "bolt.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.red)
            }

            if shift.claimed && !shift.clockedIn {
                Button {
                    shift.clockedIn = true
                } label: {
                    Label("Clock In", systemImage: "clock.badge.checkmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .accessibilityHint("Marks this claimed shift as in progress")
            } else if shift.clockedIn {
                Label("Clocked In", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.teal)
                    .accessibilityAddTraits(.isStatusElement)
            } else {
                Button("View Details") {}
                    .buttonStyle(.bordered)
                    .controlSize(.large)
            }
        }
        .padding(18)
        .pulseGlass(cornerRadius: 28)
    }
}

struct PulseShiftBackground: View {
    var body: some View {
        LinearGradient(
            colors: [Color(red: 0.04, green: 0.09, blue: 0.16), Color.teal.opacity(0.22)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

extension View {
    @ViewBuilder
    func pulseGlass(cornerRadius: CGFloat) -> some View {
        if #available(iOS 26.0, *) {
            self
                .glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
                .accessibilityRespondsToUserInteraction(true)
        } else {
            self
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .stroke(.white.opacity(0.24), lineWidth: 1)
                )
        }
    }
}

#Preview {
    ContentView()
}
