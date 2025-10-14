import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoomsDashboard from "../User/RoomsDashboard";
import { fetchRoomsRoute } from "../../api/userService";
import { toast } from "react-toastify";
import { act } from "@testing-library/react";

// Mock API and toast
jest.mock("../../api/userService", () => ({
  fetchRoomsRoute: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("RoomsDashboard Component", () => {
  const roomsMock = [
    {
      id: 1,
      name: "Room 1",
      type: "chat",
      description: "Description 1",
      is_active: true,
      participants: 5,
      created_at: "2025-10-13T06:00:00Z",
      owner: { name: "Alice" },
    },
    {
      id: 2,
      name: "Room 2",
      type: "video",
      description: "Description 2",
      is_active: false,
      participants: 3,
      created_at: "2025-10-12T06:00:00Z",
      owner: { name: "Bob" },
    },
  ];

  beforeEach(() => {
    fetchRoomsRoute.mockReset();
    toast.error.mockReset();
    mockNavigate.mockReset();
  });

  test("renders loading spinner initially", async () => {
    fetchRoomsRoute.mockResolvedValue({ data: { results: [], count: 0 } });
    render(
      <BrowserRouter>
        <RoomsDashboard />
      </BrowserRouter>
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("renders rooms correctly when API returns data", async () => {
    fetchRoomsRoute.mockResolvedValue({ data: { results: roomsMock, count: 2 } });
    render(
      <BrowserRouter>
        <RoomsDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Room 1")).toBeInTheDocument();
      expect(screen.getByText("Room 2")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Join/i })).toHaveLength(2);
    });
  });

  test("shows error banner and toast on API failure", async () => {
    fetchRoomsRoute.mockRejectedValue(new Error("Network Error"));

    render(
      <BrowserRouter>
        <RoomsDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading rooms/i)).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith("Network Error", { position: "bottom-center" });
    });
  });

  test("search input updates state and triggers fetch", async () => {
    fetchRoomsRoute.mockResolvedValue({ data: { results: [], count: 0 } });
    render(
      <BrowserRouter>
        <RoomsDashboard />
      </BrowserRouter>
    );

    const searchInput = screen.getByLabelText("Search rooms");
    fireEvent.change(searchInput, { target: { value: "Test" } });

    await waitFor(() => {
      expect(searchInput.value).toBe("Test");
      expect(fetchRoomsRoute).toHaveBeenCalled();
    });
  });

  test("Create Room button navigates to /room", async () => {
    fetchRoomsRoute.mockResolvedValue({ data: { results: [], count: 0 } });
    render(
      <BrowserRouter>
        <RoomsDashboard />
      </BrowserRouter>
    );

    const createButton = screen.getByLabelText("Create a new room");
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith("/room");
  });

  test("Join Room button navigates for active rooms", async () => {
    fetchRoomsRoute.mockResolvedValue({ data: { results: roomsMock, count: 2 } });

    render(
      <BrowserRouter>
        <RoomsDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      const joinButtons = screen.getAllByRole("button", { name: /Join/i });
      fireEvent.click(joinButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/chat", { state: { roomId: 1, roomName: "Room 1" } });
    });
  });

  test("Join Room button disabled for inactive rooms", async () => {
    fetchRoomsRoute.mockResolvedValue({ data: { results: roomsMock, count: 2 } });

await act(async () => {
  render(
    <BrowserRouter>
      <RoomsDashboard />
    </BrowserRouter>
  );
});
    await waitFor(() => {
      const inactiveButton = screen.getByText(/Room Inactive/i).closest("button");
      expect(inactiveButton).toBeDisabled();
    });
  });
});
